import crypto from 'node:crypto';
import path from 'node:path';
import { sql } from 'kysely';
import { db } from 'csdm/node/database/database';
import { fetchHighlightClip } from 'csdm/node/web-server/highlight-clips';
import type { Sequence } from 'csdm/common/types/sequence';

export type RenderJob = {
  id: string;
  checksum: string;
  round_number: number;
  steam_id: string;
  status: 'queued' | 'rendering' | 'completed' | 'failed';
  error: string;
  claim: string;
};

export function getRenderedVideoPath(id: string) {
  if (!/^[a-f0-9-]{36}$/.test(id)) throw new Error('Invalid render job ID.');
  return path.join(process.env.CLIPS_DIR || '/data/clips', id, 'highlight.mp4');
}

export function buildRenderSequence(clip: {
  startTick: number;
  endTick: number;
  killerSteamId: string;
  killerName: string;
}): Sequence {
  return {
    number: 1,
    startTick: clip.startTick,
    endTick: clip.endTick,
    showXRay: false,
    showAssists: true,
    showOnlyDeathNotices: false,
    playersOptions: [],
    playerCameras: [{ tick: clip.startTick, playerSteamId: clip.killerSteamId, playerName: clip.killerName }],
    cameras: [],
    playerVoicesEnabled: false,
    recordAudio: true,
    deathNoticesDuration: 5,
  };
}

export async function queueHighlightRender(checksum: string, roundNumber: number, steamId: string) {
  const clip = await fetchHighlightClip(checksum, roundNumber, steamId);
  if (!clip) throw new Error('No highlight exists for this player and round.');
  const result = await sql<RenderJob>`
    INSERT INTO serve_render_jobs (id, checksum, round_number, steam_id)
    VALUES (${crypto.randomUUID()}, ${checksum}, ${roundNumber}, ${steamId})
    ON CONFLICT (checksum, round_number, steam_id) DO UPDATE
    SET status = CASE WHEN serve_render_jobs.status = 'failed' THEN 'queued' ELSE serve_render_jobs.status END,
        error = CASE WHEN serve_render_jobs.status = 'failed' THEN '' ELSE serve_render_jobs.error END,
        updated_at = now()
    RETURNING id, checksum, round_number, steam_id, status, error, claim
  `.execute(db);
  return result.rows[0];
}

export async function fetchRenderJobs() {
  const result = await sql<RenderJob>`
    SELECT id, checksum, round_number, steam_id, status, error, claim
    FROM serve_render_jobs ORDER BY created_at DESC LIMIT 100
  `.execute(db);
  return result.rows.map(({ claim: _claim, ...job }) => job);
}

export async function claimRenderJob() {
  const claim = crypto.randomUUID();
  const result = await sql<RenderJob>`
    UPDATE serve_render_jobs SET status = 'rendering', claim = ${claim},
      lease_until = now() + interval '2 minutes', updated_at = now(), error = ''
    WHERE id = (
      SELECT id FROM serve_render_jobs
      WHERE status = 'queued' OR (status = 'rendering' AND lease_until < now())
      ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1
    )
    RETURNING id, checksum, round_number, steam_id, status, error, claim
  `.execute(db);
  return result.rows[0];
}

export async function renewRenderLease(job: RenderJob) {
  const result = await sql`
    UPDATE serve_render_jobs SET lease_until = now() + interval '2 minutes', updated_at = now()
    WHERE id = ${job.id} AND claim = ${job.claim} AND status = 'rendering'
  `.execute(db);
  if (result.numAffectedRows === 0n) throw new Error('Render job lease was lost.');
}

export async function finishRenderJob(job: RenderJob, error = '') {
  await sql`
    UPDATE serve_render_jobs SET status = ${error ? 'failed' : 'completed'},
      error = ${error}, updated_at = now(), lease_until = NULL
    WHERE id = ${job.id} AND claim = ${job.claim} AND status = 'rendering'
  `.execute(db);
}
