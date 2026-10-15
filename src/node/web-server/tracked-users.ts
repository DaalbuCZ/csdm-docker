import { decodeMatchShareCode, InvalidShareCode } from 'csgo-sharecode';
import { sql } from 'kysely';
import { db } from 'csdm/node/database/database';
import { getAllNewMatchCodes } from 'csdm/node/web-server/match-history';
import { queueShareCode } from 'csdm/node/web-server/share-code-queue';
import { isValidSteamId } from 'csdm/node/web-server/users';

export type TrackedUser = {
  steamId: string;
  latestShareCode: string;
  autoDownload: boolean;
  status: string;
  error: string;
  lastCheckAt: string | null;
  newMatchesFound: number;
};

type TrackedUserRow = {
  steam_id: string;
  auth_code: string;
  latest_share_code: string;
  auto_download: number;
  status: string;
  error: string;
  last_check_at: Date | null;
  new_matches_found: number;
};

function rowToTrackedUser(row: TrackedUserRow): TrackedUser {
  return {
    steamId: row.steam_id,
    latestShareCode: row.latest_share_code,
    autoDownload: Number(row.auto_download) === 1,
    status: row.status,
    error: row.error,
    lastCheckAt: row.last_check_at ? (row.last_check_at as Date).toISOString() : null,
    newMatchesFound: Number(row.new_matches_found),
  };
}

// Share code characters are case-sensitive (they encode the match ids), so only
// trim whitespace — never change the casing. Uppercasing corrupts the code and
// Steam answers HTTP 412 to any request built from it.
function normalizeShareCode(shareCode: string) {
  return shareCode.trim();
}

function normalizeAuthCode(authCode: string) {
  return authCode.trim();
}

export async function fetchTrackedUsers(): Promise<TrackedUser[]> {
  const result = await sql<TrackedUserRow>`
    SELECT steam_id, auth_code, latest_share_code, auto_download, status, error, last_check_at, new_matches_found
    FROM serve_tracked_users
    ORDER BY created_at
  `.execute(db);

  return result.rows.map((row) => {
    const user = rowToTrackedUser(row);
    // Never expose auth codes through the API.
    return { ...user, latestShareCode: row.latest_share_code };
  });
}

export async function trackUser(steamId: string, authCode: string, shareCode: string) {
  const id = steamId.trim();
  if (!isValidSteamId(id)) {
    throw new Error('Invalid Steam ID, expected a 17-digit ID starting with 765.');
  }
  const code = normalizeAuthCode(authCode);
  if (code === '') {
    throw new Error('An authentication code is required. Get it from Valve\u2019s account data tool.');
  }
  const latest = normalizeShareCode(shareCode);
  try {
    decodeMatchShareCode(latest);
  } catch (error) {
    if (error instanceof InvalidShareCode) {
      throw new Error('Invalid share code, expected format CSGO-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX.');
    }
    throw error;
  }

  await sql`
    INSERT INTO serve_tracked_users (steam_id, auth_code, latest_share_code, status)
    VALUES (${id}, ${code}, ${latest}, 'never_checked')
    ON CONFLICT (steam_id) DO UPDATE SET auth_code = ${code}, latest_share_code = ${latest}, updated_at = now()
  `.execute(db);

  // Queue the provided code itself so the newest known match gets analyzed too.
  // A failing download (e.g. expired link) must not prevent tracking.
  try {
    await queueShareCode(latest, id);
  } catch (error) {
    logger.warn(`Could not queue initial share code for ${id}`);
    logger.warn(error instanceof Error ? error.message : String(error));
  }

  return fetchTrackedUsers();
}

export async function untrackUser(steamId: string) {
  await sql`DELETE FROM serve_tracked_users WHERE steam_id = ${steamId}`.execute(db);
  return fetchTrackedUsers();
}

export async function setTrackedUserAutoDownload(steamId: string, enabled: boolean) {
  await sql`
    UPDATE serve_tracked_users
    SET auto_download = ${enabled ? 1 : 0}, updated_at = now()
    WHERE steam_id = ${steamId}
  `.execute(db);
  return fetchTrackedUsers();
}

async function setTrackedUserState(
  steamId: string,
  status: string,
  error: string,
  latestShareCode?: string,
  newMatchesFound?: number,
) {
  await sql`
    UPDATE serve_tracked_users
    SET status = ${status},
      error = ${error},
      latest_share_code = COALESCE(${latestShareCode ?? null}, latest_share_code),
      new_matches_found = COALESCE(${newMatchesFound ?? null}, new_matches_found),
      last_check_at = now(),
      updated_at = now()
    WHERE steam_id = ${steamId}
  `.execute(db);
}

export async function checkTrackedUser(apiKey: string, steamId: string): Promise<string[]> {
  const result = await sql<TrackedUserRow>`
    SELECT steam_id, auth_code, latest_share_code, auto_download, status, error, last_check_at, new_matches_found
    FROM serve_tracked_users
    WHERE steam_id = ${steamId}
  `.execute(db);
  const row = result.rows[0];
  if (row === undefined) {
    throw new Error('User is not tracked.');
  }
  if (apiKey === '') {
    throw new Error('Server has no Steam API key configured. Set STEAM_API_KEY to enable automatic tracking.');
  }

  await setTrackedUserState(steamId, 'checking', '');
  try {
    const newCodes = await getAllNewMatchCodes({
      apiKey,
      steamId,
      authCode: row.auth_code,
      startCode: row.latest_share_code,
      maxCodes: 30,
    });
    for (const code of newCodes) {
      try {
        await queueShareCode(code, steamId);
      } catch (error) {
        logger.warn(`Skipping share code ${code} for ${steamId}`);
        logger.warn(error instanceof Error ? error.message : String(error));
      }
    }
    const latest = newCodes.at(-1);
    await setTrackedUserState(steamId, 'ok', '', latest, newCodes.length);
    return newCodes;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await setTrackedUserState(steamId, 'error', message);
    throw error;
  }
}

export async function checkAllTrackedUsers(apiKey: string) {
  const result = await sql<{ steam_id: string }>`
    SELECT steam_id FROM serve_tracked_users WHERE auto_download = 1 ORDER BY created_at
  `.execute(db);

  for (const row of result.rows) {
    try {
      const newCodes = await checkTrackedUser(apiKey, row.steam_id);
      logger.log(`Tracked user ${row.steam_id}: ${newCodes.length} new match(es)`);
    } catch (error) {
      logger.error(`Failed to check tracked user ${row.steam_id}`);
      logger.error(error instanceof Error ? error.message : String(error));
    }
  }
}
