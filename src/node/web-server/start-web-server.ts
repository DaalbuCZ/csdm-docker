import http, { type IncomingMessage, type ServerResponse } from 'node:http';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { sql } from 'kysely';
import { db } from 'csdm/node/database/database';
import {
  buildRenderSequence,
  fetchRenderJobs,
  getRenderedVideoPath,
  queueHighlightRender,
} from 'csdm/node/web-server/render-queue';
import fs from 'fs-extra';
import { watch } from 'chokidar';
import { fetchMatchesTable } from 'csdm/node/database/matches/fetch-matches-table';
import { fetchMatchTable } from 'csdm/node/database/matches/fetch-match-table';
import { fetchMatchPlayers } from 'csdm/node/database/match-players/fetch-match-players';
import { fetchRounds } from 'csdm/node/database/rounds/fetch-rounds';
import { fetchKills } from 'csdm/node/database/kills/fetch-kills';
import { fetchClutches } from 'csdm/node/database/clutches/fetch-cluches';
import { fetchPlayersTable } from 'csdm/node/database/players/fetch-players-table';
import { fetchPlayer } from 'csdm/node/database/player/fetch-player';
import { fetchPlayerLastMatches } from 'csdm/node/database/player/fetch-player-last-matches';
import { enqueueDemo, getQueueDetails, getQueueStatus } from 'csdm/node/web-server/demo-queue';
import { fetchHighlights } from 'csdm/node/web-server/fetch-highlights';
import {
  fetchServeSessionUser,
  fetchServeUsers,
  isValidSteamId,
  linkServeUser,
  unlinkServeUser,
} from 'csdm/node/web-server/users';
import { getSteamLoginUrl, verifySteamCallback } from 'csdm/node/web-server/steam-openid';
import {
  buildClearSessionCookieHeader,
  buildSetSessionCookieHeader,
  getSessionSteamId,
} from 'csdm/node/web-server/session';
import { fetchShareCodeJobs, queueShareCode, retryFailedShareCodeJobs } from 'csdm/node/web-server/share-code-queue';
import {
  checkTrackedUser,
  fetchTrackedUsers,
  setTrackedUserAutoDownload,
  trackUser,
  untrackUser,
} from 'csdm/node/web-server/tracked-users';
import {
  fetchMapTransform,
  fetchPlayerHistory,
  fetchRoundTickrate,
  fetchViewerGrenades,
  fetchViewerPositions,
  fetchViewerShots,
  getRadarFilePath,
} from 'csdm/node/web-server/fetch-viewer-data';
import { fetchMatchGrenades, fetchMatchHeatmap, fetchMatchWeapons } from 'csdm/node/web-server/match-stats';
import { fetchMatchDuelsMatrixRows } from 'csdm/node/database/match/fetch-match-duels-matrix-rows';
import { fetchChatMessages } from 'csdm/node/database/chat-messages/fetch-chat-messages';
import { fetchHighlightClip, fetchMatchHighlightSequences } from 'csdm/node/web-server/highlight-clips';
import { isDiscordEnabled } from 'csdm/node/web-server/discord';
import { WEB_UI_HTML } from 'csdm/node/web-server/web-ui';

export type WebServerOptions = {
  port: number;
  inboxFolderPath: string;
  apiToken: string;
  maxUploadBytes: number;
  publicUrl: string;
  sessionSecret: string;
  steamApiKey: string;
};

function sendJson(response: ServerResponse, statusCode: number, value: unknown) {
  response.writeHead(statusCode, { 'content-type': 'application/json' });
  response.end(JSON.stringify(value));
}

function clampInt(raw: string | null, min: number, max: number, fallback: number) {
  if (raw === null || raw.trim() === '') return fallback;
  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, parsed));
}

function isAuthorized(request: IncomingMessage, apiToken: string, sessionSecret: string) {
  if (apiToken === '') {
    return true;
  }
  const header = request.headers.authorization ?? '';
  if (header === `Bearer ${apiToken}`) {
    return true;
  }
  if (getSessionSteamId(request.headers.cookie, sessionSecret) !== null) {
    return true;
  }
  const url = new URL(request.url ?? '/', 'http://localhost');
  return url.searchParams.get('token') === apiToken;
}

function sanitizeFilename(filename: string) {
  const base = filename.replaceAll('\\', '/').split('/').at(-1) ?? 'demo.dem';
  const cleaned = base.replaceAll(/[^a-zA-Z0-9._-]/g, '_');
  return cleaned.endsWith('.dem') ? cleaned : `${cleaned}.dem`;
}

async function readBody(request: IncomingMessage, maxBytes: number) {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string);
    size += buffer.length;
    if (size > maxBytes) {
      throw new Error(`Upload too large, max is ${Math.round(maxBytes / 1024 / 1024)} MB`);
    }
    chunks.push(buffer);
  }
  return Buffer.concat(chunks);
}

async function readJsonBody(request: IncomingMessage): Promise<Record<string, unknown>> {
  const buffer = await readBody(request, 1024 * 1024);
  if (buffer.length === 0) {
    return {};
  }
  return JSON.parse(buffer.toString('utf-8')) as Record<string, unknown>;
}

async function writeStreamToFile(request: IncomingMessage, filePath: string, maxBytes: number) {
  await new Promise<void>((resolve, reject) => {
    let size = 0;
    const out = fs.createWriteStream(filePath);
    request.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > maxBytes) {
        request.destroy();
        out.destroy();
        reject(new Error(`Upload too large, max is ${Math.round(maxBytes / 1024 / 1024)} MB`));
      }
    });
    request.on('error', reject);
    out.on('error', reject);
    request.pipe(out);
    out.on('finish', () => resolve());
  });
}

export async function startWebServer(options: WebServerOptions) {
  const { port, inboxFolderPath, apiToken, maxUploadBytes, publicUrl, sessionSecret, steamApiKey } = options;
  await fs.ensureDir(inboxFolderPath);

  const watcher = watch([inboxFolderPath, ...(process.env.SERVER_DEMOS_DIR ? [process.env.SERVER_DEMOS_DIR] : [])], {
    ignoreInitial: false,
    ignored: (filePath, stats) => Boolean(stats?.isFile() && !/\.dem(?:\.bz2)?$/i.test(filePath)),
    awaitWriteFinish: {
      stabilityThreshold: 2000,
      pollInterval: 500,
    },
  });
  watcher.on('add', (demoPath: string) => {
    logger.log(`Inbox demo detected: ${demoPath}`);
    enqueueDemo(demoPath);
  });

  const server = http.createServer((request, response) => {
    void handleRequest(request, response);
  });
  // Demo uploads can take minutes on slow links, Node's default 5 minutes request
  // timeout would kill them mid-flight.
  server.requestTimeout = 0;

  async function handleRequest(request: IncomingMessage, response: ServerResponse) {
    try {
      const url = new URL(request.url ?? '/', 'http://localhost');

      if (request.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
        response.writeHead(200, { 'content-type': 'text/html' });
        response.end(WEB_UI_HTML);
        return;
      }

      if (request.method === 'GET' && url.pathname === '/static/js/chart.umd.min.js') {
        const candidates = [
          path.join(process.cwd(), 'node_modules', 'chart.js', 'dist', 'chart.umd.min.js'),
          path.join('/app', 'node_modules', 'chart.js', 'dist', 'chart.umd.min.js'),
        ];
        for (const candidate of candidates) {
          if (await fs.pathExists(candidate)) {
            const content = await fs.readFile(candidate);
            response.writeHead(200, { 'content-type': 'text/javascript', 'cache-control': 'public, max-age=86400' });
            response.end(content);
            return;
          }
        }
        sendJson(response, 404, { error: 'Chart library not found on server' });
        return;
      }

      if (request.method === 'GET' && url.pathname.startsWith('/static/icons/')) {
        const relative = url.pathname.slice('/static/icons/'.length);
        const parts = relative.split('/');
        const folder = parts.length === 2 ? parts[0] : '';
        const file = parts.length === 2 ? parts[1] : parts[0];
        if ((folder !== '' && folder !== 'weapons') || !/^[a-z0-9-]+\.svg$/.test(file ?? '')) {
          sendJson(response, 404, { error: 'Not found' });
          return;
        }
        const candidates =
          folder === 'weapons'
            ? [
                path.join('/app', 'assets', 'icons', 'weapons', file),
                path.join(process.cwd(), 'src', 'ui', 'icons', 'weapons', file),
              ]
            : [path.join('/app', 'assets', 'icons', file), path.join(process.cwd(), 'src', 'ui', 'icons', file)];
        for (const candidate of candidates) {
          if (await fs.pathExists(candidate)) {
            const content = await fs.readFile(candidate);
            response.writeHead(200, { 'content-type': 'image/svg+xml', 'cache-control': 'public, max-age=86400' });
            response.end(content);
            return;
          }
        }
        sendJson(response, 404, { error: 'Icon not found' });
        return;
      }

      if (request.method === 'GET' && url.pathname.startsWith('/static/radars/')) {
        const relative = url.pathname.slice('/static/radars/'.length);
        const [game, file] = relative.split('/');
        if (game === undefined || file === undefined || !/^(cs2|csgo)$/.test(game) || !/^[a-z0-9_]+\.png$/.test(file)) {
          sendJson(response, 404, { error: 'Not found' });
          return;
        }
        const filePath = getRadarFilePath(game, file.replace(/\.png$/, ''));
        if (!(await fs.pathExists(filePath))) {
          sendJson(response, 404, { error: 'Radar not found' });
          return;
        }
        const content = await fs.readFile(filePath);
        response.writeHead(200, { 'content-type': 'image/png', 'cache-control': 'public, max-age=86400' });
        response.end(content);
        return;
      }

      if (request.method === 'GET' && url.pathname === '/auth/steam') {
        response.writeHead(302, { location: getSteamLoginUrl(publicUrl) });
        response.end();
        return;
      }

      if (request.method === 'GET' && url.pathname === '/auth/steam/callback') {
        const steamId = await verifySteamCallback(url);
        if (steamId === null || !isValidSteamId(steamId)) {
          sendJson(response, 401, { error: 'Steam login verification failed.' });
          return;
        }
        await linkServeUser(steamId, '');
        response.writeHead(302, {
          location: '/',
          'set-cookie': buildSetSessionCookieHeader(steamId, sessionSecret),
        });
        response.end();
        return;
      }

      if (request.method === 'POST' && url.pathname === '/auth/logout') {
        response.writeHead(200, {
          'content-type': 'application/json',
          'set-cookie': buildClearSessionCookieHeader(),
        });
        response.end(JSON.stringify({ ok: true }));
        return;
      }

      if (request.method === 'GET' && url.pathname === '/api/session') {
        const steamId = getSessionSteamId(request.headers.cookie, sessionSecret);
        if (steamId === null) {
          sendJson(response, 200, { user: null });
          return;
        }
        sendJson(response, 200, { user: await fetchServeSessionUser(steamId) });
        return;
      }

      if (request.method === 'GET' && url.pathname === '/health') {
        await sql`SELECT 1`.execute(db);
        sendJson(response, 200, { ok: true });
        return;
      }

      if (!url.pathname.startsWith('/api/')) {
        sendJson(response, 404, { error: 'Not found' });
        return;
      }

      if (!isAuthorized(request, apiToken, sessionSecret)) {
        sendJson(response, 401, { error: 'Invalid or missing API token' });
        return;
      }

      if (request.method === 'GET' && url.pathname === '/api/status') {
        sendJson(response, 200, {
          ...getQueueStatus(),
          discord: isDiscordEnabled(),
          downloadsConfigured:
            Boolean(process.env.STEAM_REFRESH_TOKEN) ||
            (await fs.pathExists(process.env.STEAM_REFRESH_TOKEN_FILE || '/data/steam/refresh-token')),
          trackingConfigured: steamApiKey !== '',
        });
        return;
      }

      if (request.method === 'POST' && url.pathname === '/api/share-codes/retry') {
        await retryFailedShareCodeJobs();
        sendJson(response, 200, { ok: true });
        return;
      }

      if (request.method === 'GET' && url.pathname === '/api/render-jobs') {
        sendJson(response, 200, { jobs: await fetchRenderJobs() });
        return;
      }

      if (request.method === 'POST' && url.pathname === '/api/render-jobs') {
        const body = await readJsonBody(request);
        if (
          typeof body.checksum !== 'string' ||
          typeof body.steamId !== 'string' ||
          !isValidSteamId(body.steamId) ||
          !Number.isSafeInteger(body.roundNumber) ||
          Number(body.roundNumber) <= 0
        ) {
          sendJson(response, 400, { error: 'Provide checksum, roundNumber, and a player Steam ID.' });
          return;
        }
        sendJson(response, 202, {
          job: await queueHighlightRender(body.checksum, Number(body.roundNumber), body.steamId),
        });
        return;
      }

      const renderedVideo = /^\/api\/render-jobs\/([a-f0-9-]{36})\/video$/.exec(url.pathname);
      if (request.method === 'GET' && renderedVideo) {
        const id = renderedVideo[1];
        const job = await sql<{ status: string }>`SELECT status FROM serve_render_jobs WHERE id = ${id}`.execute(db);
        if (job.rows[0]?.status !== 'completed') {
          sendJson(response, 404, { error: 'Video is not ready.' });
          return;
        }
        const file = getRenderedVideoPath(id);
        const { size } = await fs.stat(file);
        const range = request.headers.range;
        const match = range ? /^bytes=(\d+)-(\d*)$/.exec(range) : null;
        const start = match ? Number(match[1]) : 0;
        const end = match && match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
        if ((range && !match) || start > end || start >= size) {
          response.writeHead(416, { 'content-range': `bytes */${size}` });
          response.end();
          return;
        }
        response.writeHead(match ? 206 : 200, {
          'content-type': 'video/mp4',
          'accept-ranges': 'bytes',
          'content-length': end - start + 1,
          ...(match ? { 'content-range': `bytes ${start}-${end}/${size}` } : {}),
        });
        await pipeline(fs.createReadStream(file, { start, end }), response);
        return;
      }

      if (request.method === 'GET' && url.pathname === '/api/queue') {
        sendJson(response, 200, getQueueDetails());
        return;
      }

      if (request.method === 'GET' && url.pathname === '/api/matches') {
        const steamId = url.searchParams.get('steamId') ?? undefined;
        const mapName = url.searchParams.get('map') ?? undefined;
        const startDate = url.searchParams.get('from') ?? undefined;
        const endDate = url.searchParams.get('to') ?? undefined;
        const limit = clampInt(url.searchParams.get('limit'), 1, 200, 50);
        const matches = await fetchMatchesTable({
          startDate,
          endDate,
          demoSources: [],
          demoTypes: [],
          games: [],
          gameModes: [],
          tagIds: [],
          maxRounds: [],
          steamId,
        });
        const sorted = [...matches]
          .filter((match) => !mapName || match.mapName === mapName)
          .sort((a, b) => {
            return new Date(b.date).getTime() - new Date(a.date).getTime();
          });
        sendJson(response, 200, { matches: sorted.slice(0, limit) });
        return;
      }

      if (request.method === 'GET' && url.pathname === '/api/highlights') {
        const steamId = url.searchParams.get('steamId') ?? undefined;
        const mapName = url.searchParams.get('map') ?? undefined;
        const kindParam = url.searchParams.get('kind');
        const kind = kindParam === 'clutch' || kindParam === 'multi-kill' ? kindParam : undefined;
        const limit = clampInt(url.searchParams.get('limit'), 1, 200, 50);
        const highlights = await fetchHighlights(steamId, limit, { mapName, kind });
        sendJson(response, 200, { highlights });
        return;
      }

      if (request.method === 'GET' && url.pathname === '/api/users') {
        sendJson(response, 200, { users: await fetchServeUsers() });
        return;
      }

      if (request.method === 'POST' && url.pathname === '/api/users') {
        const body = await readJsonBody(request);
        const steamId = (typeof body.steamId === 'string' ? body.steamId : '').trim();
        const displayName = (typeof body.displayName === 'string' ? body.displayName : '').trim();
        if (!isValidSteamId(steamId)) {
          sendJson(response, 400, { error: 'Invalid Steam ID, expected a 17-digit ID starting with 765.' });
          return;
        }
        await linkServeUser(steamId, displayName);
        sendJson(response, 200, { users: await fetchServeUsers() });
        return;
      }

      if (request.method === 'DELETE' && url.pathname.startsWith('/api/users/')) {
        const steamId = decodeURIComponent(url.pathname.slice('/api/users/'.length));
        await unlinkServeUser(steamId);
        sendJson(response, 200, { users: await fetchServeUsers() });
        return;
      }

      if (request.method === 'GET' && url.pathname === '/api/share-codes') {
        sendJson(response, 200, { jobs: await fetchShareCodeJobs(50) });
        return;
      }

      if (request.method === 'GET' && url.pathname === '/api/tracked-users') {
        sendJson(response, 200, { users: await fetchTrackedUsers() });
        return;
      }

      if (request.method === 'POST' && url.pathname === '/api/tracked-users') {
        const body = await readJsonBody(request);
        const steamId = (typeof body.steamId === 'string' ? body.steamId : '').trim();
        try {
          const users = await trackUser(
            steamId,
            typeof body.authCode === 'string' ? body.authCode : '',
            typeof body.shareCode === 'string' ? body.shareCode : '',
          );
          // Check right away instead of waiting for the next poll so new matches
          // are queued immediately, like Leetify's auto-import.
          if (steamApiKey !== '') {
            void checkTrackedUser(steamApiKey, steamId).catch((error) => {
              logger.error(`Initial check failed for tracked user ${steamId}`);
              logger.error(error instanceof Error ? error.message : String(error));
            });
          }
          sendJson(response, 200, { users });
        } catch (error) {
          sendJson(response, 400, { error: error instanceof Error ? error.message : String(error) });
        }
        return;
      }

      if (request.method === 'DELETE' && url.pathname.startsWith('/api/tracked-users/')) {
        const steamId = decodeURIComponent(url.pathname.slice('/api/tracked-users/'.length));
        sendJson(response, 200, { users: await untrackUser(steamId) });
        return;
      }

      if (request.method === 'POST' && url.pathname.startsWith('/api/tracked-users/')) {
        const rest = decodeURIComponent(url.pathname.slice('/api/tracked-users/'.length));
        if (rest.endsWith('/check')) {
          const steamId = rest.slice(0, -'/check'.length);
          try {
            const newCodes = await checkTrackedUser(steamApiKey, steamId);
            sendJson(response, 200, { newCodes, users: await fetchTrackedUsers() });
          } catch (error) {
            sendJson(response, 400, { error: error instanceof Error ? error.message : String(error) });
          }
          return;
        }
        if (rest.endsWith('/auto-download')) {
          const steamId = rest.slice(0, -'/auto-download'.length);
          const body = await readJsonBody(request);
          sendJson(response, 200, {
            users: await setTrackedUserAutoDownload(steamId, body.enabled === true),
          });
          return;
        }
      }
      if (request.method === 'POST' && url.pathname === '/api/share-codes') {
        const body = await readJsonBody(request);
        const rawCodes = Array.isArray(body.shareCodes)
          ? (body.shareCodes as unknown[]).map(String)
          : [typeof body.shareCode === 'string' ? body.shareCode : ''];
        const shareCodes = [...new Set(rawCodes.map((code) => code.trim()).filter((code) => code !== ''))].slice(0, 20);
        if (shareCodes.length === 0) {
          sendJson(response, 400, { error: 'No share code provided.' });
          return;
        }
        const sessionSteamId = getSessionSteamId(request.headers.cookie, sessionSecret);
        const steamId =
          typeof body.steamId === 'string' && isValidSteamId(body.steamId.trim())
            ? body.steamId.trim()
            : sessionSteamId;
        const jobs = [];
        for (const shareCode of shareCodes) {
          try {
            jobs.push(await queueShareCode(shareCode, steamId));
          } catch (error) {
            sendJson(response, 400, { error: error instanceof Error ? error.message : String(error) });
            return;
          }
        }
        sendJson(response, 201, { jobs });
        return;
      }

      if (request.method === 'GET' && url.pathname === '/api/maps') {
        const game = url.searchParams.get('game') ?? 'cs2';
        const name = url.searchParams.get('name') ?? '';
        const transform = await fetchMapTransform(game, name);
        if (transform === null) {
          sendJson(response, 404, { error: 'Map transform not found' });
          return;
        }
        sendJson(response, 200, { map: transform });
        return;
      }

      if (request.method === 'GET' && url.pathname.startsWith('/api/matches/') && url.pathname.endsWith('/demo')) {
        const checksum = getMatchChecksumFromSuffix('/demo');
        if (!/^[a-z0-9]+$/i.test(checksum)) {
          sendJson(response, 400, { error: 'Invalid checksum.' });
          return;
        }
        const match = await db
          .selectFrom('matches')
          .select('demo_path')
          .where('checksum', '=', checksum)
          .executeTakeFirstOrThrow();
        const { size } = await fs.stat(match.demo_path);
        response.writeHead(200, {
          'content-type': 'application/octet-stream',
          'content-length': size,
          'content-disposition': `attachment; filename="${checksum}.dem"`,
        });
        await pipeline(fs.createReadStream(match.demo_path), response);
        return;
      }

      if (request.method === 'GET' && url.pathname.startsWith('/api/matches/') && url.pathname.endsWith('/weapons')) {
        sendJson(response, 200, { weapons: await fetchMatchWeapons(getMatchChecksumFromSuffix('/weapons')) });
        return;
      }

      if (request.method === 'GET' && url.pathname.startsWith('/api/matches/') && url.pathname.endsWith('/grenades')) {
        sendJson(response, 200, { grenades: await fetchMatchGrenades(getMatchChecksumFromSuffix('/grenades')) });
        return;
      }

      if (request.method === 'GET' && url.pathname.startsWith('/api/matches/') && url.pathname.endsWith('/heatmap')) {
        sendJson(response, 200, { points: await fetchMatchHeatmap(getMatchChecksumFromSuffix('/heatmap'), 2000) });
        return;
      }

      if (request.method === 'GET' && url.pathname.startsWith('/api/matches/') && url.pathname.endsWith('/duels')) {
        sendJson(response, 200, { duels: await fetchMatchDuelsMatrixRows(getMatchChecksumFromSuffix('/duels')) });
        return;
      }

      if (request.method === 'GET' && url.pathname.startsWith('/api/matches/') && url.pathname.endsWith('/chat')) {
        sendJson(response, 200, { messages: await fetchChatMessages(getMatchChecksumFromSuffix('/chat')) });
        return;
      }

      if (
        request.method === 'GET' &&
        url.pathname.startsWith('/api/matches/') &&
        url.pathname.endsWith('/clips/export')
      ) {
        const checksum = decodeURIComponent(url.pathname.slice('/api/matches/'.length, -'/clips/export'.length));
        const sequences = await fetchMatchHighlightSequences(checksum);
        const config = {
          demoPath: `${checksum}.dem`,
          trueView: false,
          recordingSystem: 'CS',
          recordingOutput: 'video',
          encoderSoftware: 'FFmpeg',
          width: 1920,
          height: 1080,
          framerate: 30,
          sequences: sequences.map(buildRenderSequence),
        };
        response.writeHead(200, {
          'content-type': 'application/json',
          'content-disposition': `attachment; filename="highlights-${checksum}.json"`,
        });
        response.end(JSON.stringify(config, null, 2));
        return;
      }

      if (
        request.method === 'GET' &&
        url.pathname.startsWith('/api/matches/') &&
        url.pathname.includes('/rounds/') &&
        url.pathname.endsWith('/clip')
      ) {
        const rest = decodeURIComponent(url.pathname.slice('/api/matches/'.length, -'/clip'.length));
        const [checksum, , roundRaw] = rest.split('/');
        const roundNumber = Number(roundRaw);
        const killerSteamId = (url.searchParams.get('steamId') ?? '').trim();
        if (!checksum || !Number.isSafeInteger(roundNumber) || roundNumber <= 0 || killerSteamId === '') {
          sendJson(response, 400, { error: 'Expected /api/matches/<checksum>/rounds/<round>/clip?steamId=<steam-id>' });
          return;
        }
        const clip = await fetchHighlightClip(checksum, roundNumber, killerSteamId);
        if (clip === null) {
          sendJson(response, 404, { error: 'No highlight found for this round and player' });
          return;
        }
        sendJson(response, 200, { clip });
        return;
      }

      function getMatchChecksumFromSuffix(suffix: string) {
        return decodeURIComponent(url.pathname.slice('/api/matches/'.length, -suffix.length));
      }

      if (request.method === 'GET' && url.pathname.startsWith('/api/matches/') && url.pathname.endsWith('/positions')) {
        const checksum = decodeURIComponent(url.pathname.slice('/api/matches/'.length, -'/positions'.length));
        const roundParam = Number(url.searchParams.get('round') ?? '');
        if (!Number.isSafeInteger(roundParam) || roundParam <= 0) {
          sendJson(response, 400, { error: 'Missing ?round=N parameter' });
          return;
        }
        const positions = await fetchViewerPositions(checksum, roundParam, 4);
        const [grenades, tickrate, shots] = await Promise.all([
          fetchViewerGrenades(checksum, roundParam, 4),
          fetchRoundTickrate(checksum),
          fetchViewerShots(checksum, roundParam),
        ]);
        sendJson(response, 200, { positions, tickStride: 4, tickrate, grenades, shots });
        return;
      }

      if (request.method === 'GET' && url.pathname.startsWith('/api/matches/')) {
        const checksum = decodeURIComponent(url.pathname.slice('/api/matches/'.length));
        const [match, players, rounds, kills, clutches] = await Promise.all([
          fetchMatchTable(checksum),
          fetchMatchPlayers(checksum),
          fetchRounds(checksum),
          fetchKills(checksum),
          fetchClutches(checksum),
        ]);
        sendJson(response, 200, { match, players, rounds, kills, clutches });
        return;
      }

      if (request.method === 'GET' && url.pathname === '/api/players') {
        const players = await fetchPlayersTable({
          bans: [],
          startDate: undefined,
          endDate: undefined,
          tagIds: [],
        });
        const sorted = players.toSorted((a, b) => b.matchCount - a.matchCount);
        sendJson(response, 200, { players: sorted.slice(0, 100) });
        return;
      }

      if (request.method === 'GET' && url.pathname.startsWith('/api/players/') && url.pathname.endsWith('/history')) {
        const steamId = decodeURIComponent(url.pathname.slice('/api/players/'.length, -'/history'.length));
        const history = await fetchPlayerHistory(steamId, {
          limit: clampInt(url.searchParams.get('limit'), 1, 200, 60),
          mapName: url.searchParams.get('map') ?? undefined,
          startDate: url.searchParams.get('from') ?? undefined,
          endDate: url.searchParams.get('to') ?? undefined,
        });
        sendJson(response, 200, { history });
        return;
      }

      if (request.method === 'GET' && url.pathname === '/api/players/compare') {
        const steamIds = [
          ...new Set(
            url.searchParams
              .getAll('steamId')
              .map((id) => id.trim())
              .filter((id) => id !== ''),
          ),
        ].slice(0, 4);
        if (steamIds.length < 2) {
          sendJson(response, 400, { error: 'Provide at least two steamId query parameters.' });
          return;
        }
        const filters = {
          startDate: undefined,
          endDate: undefined,
          demoSources: [],
          demoTypes: [],
          games: [],
          gameModes: [],
          tagIds: [],
          maxRounds: [],
        };
        const players = await Promise.all(
          steamIds.map(async (steamId) => {
            try {
              const player = await fetchPlayer(steamId, filters);
              return { steamId, player };
            } catch {
              return { steamId, player: null };
            }
          }),
        );
        if (players.some((entry) => entry.player === null)) {
          sendJson(response, 404, {
            error: 'One or more players have no analyzed matches yet.',
          });
          return;
        }
        sendJson(response, 200, { players });
        return;
      }

      if (request.method === 'GET' && url.pathname.startsWith('/api/players/')) {
        const steamId = decodeURIComponent(url.pathname.slice('/api/players/'.length));
        const filters = {
          startDate: undefined,
          endDate: undefined,
          demoSources: [],
          demoTypes: [],
          games: [],
          gameModes: [],
          tagIds: [],
          maxRounds: [],
        };
        const [player, lastMatches] = await Promise.all([
          fetchPlayer(steamId, filters),
          fetchPlayerLastMatches(steamId),
        ]);
        sendJson(response, 200, { player, lastMatches });
        return;
      }

      if (request.method === 'POST' && url.pathname === '/api/demos/upload') {
        const rawFilename = (request.headers['x-filename'] as string | undefined) ?? `upload-${Date.now()}.dem`;
        // The UI percent-encodes filenames so that non ASCII characters survive HTTP headers.
        let decodedFilename = rawFilename;
        try {
          decodedFilename = decodeURIComponent(rawFilename);
        } catch {
          // Header value was not percent-encoded, keep it as is.
        }
        const filename = sanitizeFilename(decodedFilename);
        const querySteamId = (url.searchParams.get('steamId') ?? '').replaceAll(/[^0-9]/g, '');
        const steamId =
          querySteamId !== '' ? querySteamId : (getSessionSteamId(request.headers.cookie, sessionSecret) ?? '');
        const targetFolder = steamId ? path.join(inboxFolderPath, steamId) : path.join(inboxFolderPath, 'uploads');
        await fs.ensureDir(targetFolder);
        const demoPath = path.join(targetFolder, `${Date.now()}-${filename}`);
        try {
          await writeStreamToFile(request, `${demoPath}.part`, maxUploadBytes);
          await fs.move(`${demoPath}.part`, demoPath);
        } catch (error) {
          await fs.remove(`${demoPath}.part`).catch(() => undefined);
          throw error;
        }
        const stats = await fs.stat(demoPath);
        if (stats.size === 0) {
          await fs.remove(demoPath);
          sendJson(response, 400, { error: 'Empty upload' });
          return;
        }
        enqueueDemo(demoPath);
        sendJson(response, 201, { demoPath, steamId: steamId || null });
        return;
      }

      sendJson(response, 404, { error: 'Not found' });
    } catch (error) {
      logger.error(error);
      if (response.headersSent) {
        response.destroy();
        return;
      }
      sendJson(response, 500, { error: error instanceof Error ? error.message : String(error) });
    }
  }

  await new Promise<void>((resolve) => {
    server.listen(port, () => {
      logger.log(`CS Demo Manager server listening on port ${port}`);
      resolve();
    });
  });

  return { server, watcher };
}
