import crypto from 'node:crypto';
import path from 'node:path';
import { pipeline } from 'node:stream';
import util from 'node:util';
import fs from 'fs-extra';
import { request } from 'undici';
import b2 from 'unbzip2-stream';
import { decodeMatchShareCode, InvalidShareCode } from 'csgo-sharecode';
import { CDataGCCStrike15_v2_MatchInfoSchema, toBinary, type CDataGCCStrike15_v2_MatchInfo } from 'csgo-protobuf';
import { sql } from 'kysely';
import { db } from 'csdm/node/database/database';
import { startBoiler } from 'csdm/node/boiler/start-boiler';
import { SteamCommunicationError } from 'csdm/node/boiler/errors/steam-communication-error';
import { AlreadyConnected } from 'csdm/node/boiler/errors/already-connected';
import { SteamRestartRequired } from 'csdm/node/boiler/errors/steam-restart-required';
import { BoilerSteamNotRunning } from 'csdm/node/boiler/errors/boiler-steam-not-running';
import { UserNotConnected } from 'csdm/node/boiler/errors/user-not-connected';
import { NoMatchesFound } from 'csdm/node/boiler/errors/no-matches-found';
import { InvalidArgs } from 'csdm/node/boiler/errors/invalid-args';
import { MatchesInfoFileNotFound } from 'csdm/node/boiler/errors/matches-info-file-not-found';
import { SteamNotRunning } from 'csdm/node/counter-strike/launcher/errors/steam-not-running';
import {
  buildMatchName,
  getLastRoundStatsMessage,
} from 'csdm/node/valve-match/get-valve-match-from-match-info-protobuf-message';
import { isDownloadLinkExpired } from 'csdm/node/download/is-download-link-expired';
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

  const id = crypto.randomUUID();
  await sql`
    INSERT INTO serve_share_code_jobs (id, share_code, steam_id, status)
    VALUES (${id}, ${normalized}, ${steamId}, 'queued')
  `.execute(db);
  void processShareCodeQueue();

  const result = await sql<JobRow>`
    SELECT id, share_code, steam_id, status, error, demo_path, created_at
    FROM serve_share_code_jobs
    WHERE id = ${id}
  `.execute(db);

  return rowToJob(result.rows[0]);
}

async function setJobStatus(id: string, status: ShareCodeJobStatus, error: string, demoPath: string) {
  await sql`
    UPDATE serve_share_code_jobs
    SET status = ${status}, error = ${error}, demo_path = ${demoPath}, updated_at = now()
    WHERE id = ${id}
  `.execute(db);
}

function getBoilerErrorMessage(error: unknown) {
  if (error instanceof NoMatchesFound) {
    return 'No matches found.';
  }
  if (error instanceof SteamNotRunning || error instanceof BoilerSteamNotRunning) {
    return 'Steam is not running or logged in on the server. Start Steam there to enable share code downloads.';
  }
  if (error instanceof SteamCommunicationError) {
    return 'Error contacting Steam, make sure the server Steam account is not in-game and retry later.';
  }
  if (error instanceof AlreadyConnected) {
    return 'Already connected to the game coordinator, close CS and retry.';
  }
  if (error instanceof SteamRestartRequired) {
    return 'Steam on the server needs to be restarted.';
  }
  if (error instanceof UserNotConnected) {
    return 'Server Steam account not connected.';
  }
  if (error instanceof InvalidArgs) {
    return 'Invalid share code arguments.';
  }
  if (error instanceof MatchesInfoFileNotFound) {
    return 'Matches info file not found.';
  }
  return error instanceof Error ? error.message : String(error);
}

async function downloadDemoFromShareCode(shareCode: string, steamId: string | null): Promise<string> {
  const { matchId, reservationId, tvPort } = decodeMatchShareCode(shareCode);
  const { matches } = await startBoiler({
    args: [matchId.toString(), reservationId.toString(), tvPort.toString()],
  });
  if (matches.length === 0) {
    throw new Error('Demo link expired or match not found.');
  }

  const matchInfo = matches[0] as CDataGCCStrike15_v2_MatchInfo;
  const watchInfo = matchInfo.watchablematchinfo as { tvPort: number; serverIp: number };
  const lastRoundMessage = getLastRoundStatsMessage(matchInfo);
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
  if (await isDownloadLinkExpired(demoUrl)) {
    throw new Error('Demo download link expired.');
  }

  const response = await request(demoUrl, { method: 'GET' });
  if (!response.body) {
    throw new Error('Download request failed.');
  }
  const out = fs.createWriteStream(demoPath);
  await streamPipeline(response.body, b2(), out);
  await fs.writeFile(`${demoPath}.info`, toBinary(CDataGCCStrike15_v2_MatchInfoSchema, matchInfo));

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
        WHERE status = 'queued'
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
        await setJobStatus(job.id, 'failed', getBoilerErrorMessage(error), '');
        logger.error(`Share code job ${job.id} failed`);
        logger.error(error);
      }
    }
  } finally {
    isProcessing = false;
  }
}
