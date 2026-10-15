import crypto from 'node:crypto';
import path from 'node:path';
import { pipeline } from 'node:stream';
import util from 'node:util';
import fs from 'fs-extra';
import { request } from 'undici';
import b2 from 'unbzip2-stream';
import { decodeMatchShareCode, InvalidShareCode } from 'csgo-sharecode';
import { CDataGCCStrike15_v2_MatchInfoSchema, toBinary } from 'csgo-protobuf';
import { sql } from 'kysely';
import { db } from 'csdm/node/database/database';
import { fetchSteamMatch } from 'csdm/node/web-server/steam-match-client';
import {
  buildMatchName,
  getLastRoundStatsMessage,
} from 'csdm/node/valve-match/get-valve-match-from-match-info-protobuf-message';
import { enqueueDemo } from 'csdm/node/web-server/demo-queue';

const streamPipeline = util.promisify(pipeline);

type ShareCodeJobStatus = 'queued' | 'downloading' | 'completed' | 'failed';

export type ShareCodeJob = {
  id: string;
  shareCode: string;
  steamId: string | null;
  status: ShareCodeJobStatus;
  error: string;
  demoPath: string;
  createdAt: string;
};

type JobRow = {
  id: string;
  share_code: string;
  steam_id: string | null;
  status: string;
  error: string;
  demo_path: string;
  created_at: Date;
};

let inboxFolderPath = '';
let isProcessing = false;

export function setShareCodeInboxFolder(folderPath: string) {
  inboxFolderPath = folderPath;
}

function rowToJob(row: JobRow): ShareCodeJob {
  return {
    id: row.id,
    shareCode: row.share_code,
    steamId: row.steam_id,
    status: row.status as ShareCodeJobStatus,
    error: row.error,
    demoPath: row.demo_path,
    createdAt: (row.created_at as Date).toISOString(),
  };
}

export async function fetchShareCodeJobs(limit: number): Promise<ShareCodeJob[]> {
  const result = await sql<JobRow>`
    SELECT id, share_code, steam_id, status, error, demo_path, created_at
    FROM serve_share_code_jobs
    ORDER BY created_at DESC
    LIMIT ${limit}
  `.execute(db);

  return result.rows.map(rowToJob);
}

export async function queueShareCode(shareCode: string, steamId: string | null): Promise<ShareCodeJob> {
  // Trim only — share code characters are case-sensitive and uppercasing them
  // corrupts the encoded match ids.
  const normalized = shareCode.trim();
  try {
    decodeMatchShareCode(normalized);
  } catch (error) {
    if (error instanceof InvalidShareCode) {
      throw new Error('Invalid share code, expected format CSGO-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX.');
    }
    throw error;
  }

  const job = await db.transaction().execute(async (transaction) => {
    await sql`SELECT pg_advisory_xact_lock(hashtext(${normalized}))`.execute(transaction);
    const existing = await sql<JobRow>`
      SELECT id, share_code, steam_id, status, error, demo_path, created_at
      FROM serve_share_code_jobs
      WHERE share_code = ${normalized} AND status IN ('queued', 'downloading', 'completed')
      ORDER BY created_at DESC LIMIT 1
    `.execute(transaction);
    if (existing.rows[0]) return rowToJob(existing.rows[0]);
    const result = await sql<JobRow>`
      INSERT INTO serve_share_code_jobs (id, share_code, steam_id, status)
      VALUES (${crypto.randomUUID()}, ${normalized}, ${steamId}, 'queued')
      RETURNING id, share_code, steam_id, status, error, demo_path, created_at
    `.execute(transaction);
    return rowToJob(result.rows[0]);
  });
  void processShareCodeQueue().catch((error: unknown) => logger.error(error));
  return job;
}

async function setJobStatus(id: string, status: ShareCodeJobStatus, error: string, demoPath: string) {
  await sql`
    UPDATE serve_share_code_jobs
    SET status = ${status}, error = ${error}, demo_path = ${demoPath}, updated_at = now()
    WHERE id = ${id}
  `.execute(db);
}

async function downloadDemoFromShareCode(shareCode: string, steamId: string | null): Promise<string> {
  const matchInfo = await fetchSteamMatch(shareCode);
  const watchInfo = matchInfo.watchablematchinfo as { tvPort: number; serverIp: number };
  const lastRoundMessage = getLastRoundStatsMessage(matchInfo);
  if (!watchInfo || !lastRoundMessage) {
    throw new Error('Steam returned incomplete match info.');
  }
  const lastRoundReservationId = (lastRoundMessage.reservationid ?? 0n) as bigint;
  const demoName = buildMatchName(lastRoundReservationId, watchInfo.tvPort, watchInfo.serverIp);
  const targetFolder = steamId ? path.join(inboxFolderPath, steamId) : path.join(inboxFolderPath, 'downloads');
  await fs.ensureDir(targetFolder);
  const demoPath = path.join(targetFolder, `${demoName}.dem`);
  if (await fs.pathExists(demoPath)) {
    return demoPath;
  }

  const demoUrl = (lastRoundMessage.map ?? '') as string;
  if (demoUrl === '') {
    throw new Error('Demo URL not found in match info.');
  }
  const response = await request(demoUrl, {
    method: 'GET',
    signal: AbortSignal.timeout(10 * 60 * 1000),
    headersTimeout: 30_000,
    bodyTimeout: 60_000,
  });
  if (response.statusCode !== 200) {
    await response.body.dump();
    throw new Error(`Demo download failed (HTTP ${response.statusCode}); the replay may have expired.`);
  }
  const partialPath = `${demoPath}.part`;
  const infoPartialPath = `${demoPath}.info.part`;
  try {
    await streamPipeline(response.body, b2(), fs.createWriteStream(partialPath));
    const { size } = await fs.stat(partialPath);
    if (size < 8) throw new Error('Downloaded demo is empty or truncated.');
    await fs.writeFile(infoPartialPath, toBinary(CDataGCCStrike15_v2_MatchInfoSchema, matchInfo));
    await fs.move(infoPartialPath, `${demoPath}.info`, { overwrite: true });
    await fs.move(partialPath, demoPath, { overwrite: true });
  } catch (error) {
    await Promise.all([fs.remove(partialPath), fs.remove(infoPartialPath)]);
    throw error;
  }

  return demoPath;
}

async function processShareCodeQueue() {
  if (isProcessing) {
    return;
  }
  isProcessing = true;

  try {
    while (true) {
      const result = await sql<JobRow>`
        SELECT id, share_code, steam_id, status, error, demo_path, created_at
        FROM serve_share_code_jobs
        WHERE status = 'queued' AND retry_at <= now()
        ORDER BY created_at
        LIMIT 1
      `.execute(db);
      const job = result.rows[0];
      if (job === undefined) {
        break;
      }

      await setJobStatus(job.id, 'downloading', '', '');
      try {
        const demoPath = await downloadDemoFromShareCode(job.share_code, job.steam_id);
        enqueueDemo(demoPath);
        await setJobStatus(job.id, 'completed', '', demoPath);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const transient = /timed out|disconnected|ECONN|fetch failed|HTTP 5\d\d|HTTP 429/i.test(message);
        await sql`
          UPDATE serve_share_code_jobs
          SET attempts = attempts + 1, error = ${message}, updated_at = now(),
              status = CASE WHEN ${transient} AND attempts < 2 THEN 'queued' ELSE 'failed' END,
              retry_at = now() + interval '1 minute' * (attempts + 1)
          WHERE id = ${job.id}
        `.execute(db);
        logger.error(`Share code job ${job.id} failed`);
        logger.error(error);
      }
    }
  } finally {
    isProcessing = false;
  }
}

// Interrupted downloads never leave a published .dem. Reset their persisted
// state and resume jobs that were queued before a server restart.
export async function resumeShareCodeQueue() {
  await sql`UPDATE serve_share_code_jobs SET status = 'queued', updated_at = now() WHERE status = 'downloading'`.execute(
    db,
  );
  const timer = setInterval(() => {
    void processShareCodeQueue().catch((error: unknown) => logger.error(error));
  }, 30_000);
  timer.unref();
  void processShareCodeQueue().catch((error: unknown) => logger.error(error));
}

export async function retryFailedShareCodeJobs() {
  await sql`
    UPDATE serve_share_code_jobs SET status = 'queued', error = '', attempts = 0, retry_at = now(), updated_at = now()
    WHERE id IN (
      SELECT DISTINCT ON (j.share_code) j.id FROM serve_share_code_jobs j
      WHERE j.status = 'failed' AND NOT EXISTS (
        SELECT 1 FROM serve_share_code_jobs active
        WHERE active.share_code = j.share_code AND active.status IN ('queued', 'downloading', 'completed')
      ) ORDER BY j.share_code, j.created_at DESC
    )
  `.execute(db);
  void processShareCodeQueue().catch((error: unknown) => logger.error(error));
}
