import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';
import { db } from 'csdm/node/database/database';
import { insertMatchPositions } from 'csdm/node/database/matches/insert-match-positions';
import { getDemoNameFromPath } from 'csdm/node/database/matches/match-insertion';
import { getDemoFromFilePath } from 'csdm/node/demo/get-demo-from-file-path';
import { analyzeDemo } from 'csdm/node/demo/analyze-demo';
import { fetchMatchChecksums } from 'csdm/node/database/matches/fetch-match-checksums';
import { processMatchInsertion } from 'csdm/node/database/matches/process-match-insertion';
import { fetchMatchPlayers } from 'csdm/node/database/match-players/fetch-match-players';
import { fetchMatchTable } from 'csdm/node/database/matches/fetch-match-table';
import { fetchClutches } from 'csdm/node/database/clutches/fetch-cluches';
import { isDiscordEnabled, sendDiscordMatchNotification } from 'csdm/node/web-server/discord';
import { getPublicUrl } from 'csdm/node/web-server/serve-config';
import { prepareDemoFile } from 'csdm/node/web-server/prepare-demo-file';

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
        upsertRecentJob(demoPath, {
          status: 'failed',
          error: 'Demo file no longer exists.',
          finishedAt: new Date().toISOString(),
        });
        continue;
      }
      const preparedPath = await prepareDemoFile(demoPath);
      const demo = await getDemoFromFilePath(preparedPath);
      const checksums = await fetchMatchChecksums();
      const existingMatch = checksums.includes(demo.checksum);
      const positions = existingMatch
        ? await db
            .selectFrom('player_positions')
            .select('id')
            .where('match_checksum', '=', demo.checksum)
            .limit(1)
            .executeTakeFirst()
        : undefined;
      if (existingMatch && positions) {
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
        demoPath: preparedPath,
        outputFolderPath,
        source: demo.source,
        analyzePositions: true,
      });
      if (existingMatch) {
        const tables = [
          'player_positions',
          'grenade_positions',
          'inferno_positions',
          'hostage_positions',
          'chicken_positions',
        ] as const;
        const clearPositions = () =>
          Promise.all(
            tables.map((table) => db.deleteFrom(table).where('match_checksum', '=', demo.checksum).execute()),
          );
        await clearPositions();
        try {
          await insertMatchPositions({ demoName: getDemoNameFromPath(preparedPath), outputFolderPath });
          await db
            .updateTable('matches')
            .set({ demo_path: preparedPath })
            .where('checksum', '=', demo.checksum)
            .execute();
        } catch (error) {
          await clearPositions();
          throw error;
        }
      } else {
        await processMatchInsertion({ checksum: demo.checksum, demoPath: preparedPath, outputFolderPath });
      }
      await fs.remove(outputFolderPath).catch(() => undefined);
      upsertRecentJob(demoPath, { status: 'analyzed', checksum: demo.checksum, finishedAt: new Date().toISOString() });
      if (!existingMatch) void notifyDiscord(demo.checksum);
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
  if (!/\.dem(?:\.bz2)?$/i.test(demoPath)) {
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
