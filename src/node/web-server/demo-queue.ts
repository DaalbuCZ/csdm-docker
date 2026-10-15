import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';
import { getDemoFromFilePath } from 'csdm/node/demo/get-demo-from-file-path';
import { analyzeDemo } from 'csdm/node/demo/analyze-demo';
import { fetchMatchChecksums } from 'csdm/node/database/matches/fetch-match-checksums';
import { processMatchInsertion } from 'csdm/node/database/matches/process-match-insertion';
import { fetchMatchPlayers } from 'csdm/node/database/match-players/fetch-match-players';
import { fetchMatchTable } from 'csdm/node/database/matches/fetch-match-table';
import { fetchClutches } from 'csdm/node/database/clutches/fetch-cluches';
import { isDiscordEnabled, sendDiscordMatchNotification } from 'csdm/node/web-server/discord';
import { getPublicUrl } from 'csdm/node/web-server/serve-config';

export type QueueStatus = {
  pending: number;
  processing: string | null;
  lastError: string | null;
};

export type QueueJob = {
  demoPath: string;
  status: 'queued' | 'processing' | 'analyzed' | 'failed';
  checksum: string | null;
  error: string;
  finishedAt: string | null;
};

const queue: string[] = [];
let processingDemoPath: string | null = null;
let lastError: string | null = null;
let isProcessing = false;
const MAX_RECENT_JOBS = 30;
const recentJobs = new Map<string, QueueJob>();

function upsertRecentJob(demoPath: string, patch: Partial<QueueJob>) {
  const job = recentJobs.get(demoPath) ?? { demoPath, status: 'queued', checksum: null, error: '', finishedAt: null };
  recentJobs.set(demoPath, { ...job, ...patch });
  if (recentJobs.size > MAX_RECENT_JOBS) {
    const oldest = recentJobs.keys().next().value;
    if (oldest !== undefined) {
      recentJobs.delete(oldest);
    }
  }
}

export function getQueueDetails() {
  return {
    pending: queue.slice(),
    processing: processingDemoPath,
    jobs: [...recentJobs.values()].toReversed(),
  };
}

async function processQueue() {
  if (isProcessing) {
    return;
  }
  isProcessing = true;

  while (queue.length > 0) {
    const demoPath = queue.shift();
    if (demoPath === undefined) {
      break;
    }
    processingDemoPath = demoPath;
    upsertRecentJob(demoPath, { status: 'processing' });
    try {
      const exists = await fs.pathExists(demoPath);
      if (!exists) {
        continue;
      }
      const demo = await getDemoFromFilePath(demoPath);
      const checksums = await fetchMatchChecksums();
      if (checksums.includes(demo.checksum)) {
        upsertRecentJob(demoPath, {
          status: 'analyzed',
          checksum: demo.checksum,
          finishedAt: new Date().toISOString(),
        });
        continue;
      }
      const outputFolderPath = path.join(os.tmpdir(), 'csdm-serve', demo.checksum);
      await fs.ensureDir(outputFolderPath);
      await analyzeDemo({
        demoPath,
        outputFolderPath,
        source: demo.source,
        analyzePositions: true,
      });
      await processMatchInsertion({
        checksum: demo.checksum,
        demoPath,
        outputFolderPath,
      });
      await fs.remove(outputFolderPath).catch(() => undefined);
      upsertRecentJob(demoPath, { status: 'analyzed', checksum: demo.checksum, finishedAt: new Date().toISOString() });
      void notifyDiscord(demo.checksum);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      lastError = `${demoPath}: ${message}`;
      upsertRecentJob(demoPath, { status: 'failed', error: message, finishedAt: new Date().toISOString() });
      logger.error(`Failed to analyze ${demoPath}`);
      logger.error(error);
    } finally {
      processingDemoPath = null;
    }
  }

  isProcessing = false;
}

export function enqueueDemo(demoPath: string) {
  if (!demoPath.endsWith('.dem')) {
    return;
  }
  if (queue.includes(demoPath)) {
    return;
  }
  const existing = recentJobs.get(demoPath);
  if (existing && (existing.status === 'queued' || existing.status === 'processing')) {
    return;
  }
  queue.push(demoPath);
  upsertRecentJob(demoPath, { status: 'queued', checksum: null, error: '', finishedAt: null });
  void processQueue();
}

export function getQueueStatus(): QueueStatus {
  return {
    pending: queue.length,
    processing: processingDemoPath,
    lastError,
  };
}

async function notifyDiscord(checksum: string) {
  if (!isDiscordEnabled()) {
    return;
  }
  try {
    const match = await fetchMatchTable(checksum);
    const [players, clutches] = await Promise.all([fetchMatchPlayers(checksum), fetchClutches(checksum)]);
    const mvp = players.toSorted((a, b) => Number(b.hltvRating2 ?? 0) - Number(a.hltvRating2 ?? 0))[0];
    const highlightCount =
      (match.threeKillCount ?? 0) +
      (match.fourKillCount ?? 0) +
      (match.fiveKillCount ?? 0) +
      clutches.filter((clutch) => clutch.won).length;
    const base = getPublicUrl();
    await sendDiscordMatchNotification({
      mapName: match.mapName,
      date: match.date,
      teamAName: match.teamAName,
      teamBName: match.teamBName,
      teamAScore: match.teamAScore,
      teamBScore: match.teamBScore,
      killCount: match.killCount,
      mvpName: mvp?.name ?? '-',
      mvpRating: Number(mvp?.hltvRating2 ?? 0),
      highlightCount,
      matchUrl: base === '' ? '' : `${base}/#/matches/${match.checksum}`,
    });
  } catch (error) {
    logger.warn('Failed to build Discord match notification');
    logger.warn(error);
  }
}
