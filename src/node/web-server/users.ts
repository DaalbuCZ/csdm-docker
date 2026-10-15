import { sql } from 'kysely';
import { db } from 'csdm/node/database/database';
import { fetchLastPlayersData } from 'csdm/node/database/players/fetch-last-players-data';

export type ServeUser = {
  steamId: string;
  displayName: string;
  avatar: string | null;
  matchCount: number;
  lastMatchDate: string | null;
  rating2: number | null;
};

type UserRow = {
  steam_id: string;
  display_name: string;
};

type UserStatsRow = {
  steam_id: string;
  match_count: number;
  last_match_date: Date | null;
  rating2: number | null;
};

export function isValidSteamId(steamId: string) {
  return /^765[0-9]{14}$/.test(steamId);
}

export async function fetchServeUsers(): Promise<ServeUser[]> {
  const usersResult = await sql<UserRow>`SELECT steam_id, display_name FROM serve_users ORDER BY created_at`.execute(
    db,
  );
  const users = usersResult.rows;
  if (users.length === 0) {
    return [];
  }
  const steamIds = users.map((user) => user.steam_id);
  const [statsResult, lastPlayersData] = await Promise.all([
    sql<UserStatsRow>`
    SELECT players.steam_id,
      COUNT(players.match_checksum)::int AS match_count,
      MAX(demos.date) AS last_match_date,
      ROUND(AVG(players.hltv_rating_2)::numeric, 2)::float AS rating2
    FROM players
    INNER JOIN demos ON demos.checksum = players.match_checksum
    WHERE players.steam_id = ANY(${steamIds})
    GROUP BY players.steam_id
  `.execute(db),
    fetchLastPlayersData(steamIds),
  ]);
  const statsBySteamId = new Map(statsResult.rows.map((row) => [row.steam_id, row]));

  return users.map((user) => {
    const stats = statsBySteamId.get(user.steam_id);
    const lastData = lastPlayersData.find((row) => row.steamId === user.steam_id);
    return {
      steamId: user.steam_id,
      displayName: user.display_name || lastData?.lastKnownName || lastData?.name || user.steam_id,
      avatar: lastData?.avatar ?? null,
      matchCount: stats?.match_count ?? 0,
      lastMatchDate: stats?.last_match_date ? (stats.last_match_date as Date).toISOString() : null,
      rating2: stats?.rating2 ?? null,
    };
  });
}

export type ServeSessionUser = {
  steamId: string;
  displayName: string;
  avatar: string | null;
};

export async function fetchServeSessionUser(steamId: string): Promise<ServeSessionUser> {
  const userResult =
    await sql<UserRow>`SELECT steam_id, display_name FROM serve_users WHERE steam_id = ${steamId}`.execute(db);
  const lastData = await fetchLastPlayersData([steamId]);
  const row = userResult.rows[0];
  const last = lastData[0];
  return {
    steamId,
    displayName: row?.display_name || last?.lastKnownName || last?.name || steamId,
    avatar: last?.avatar ?? null,
  };
}

export async function linkServeUser(steamId: string, displayName: string) {
  await sql`
    INSERT INTO serve_users (steam_id, display_name)
    VALUES (${steamId}, ${displayName})
    ON CONFLICT (steam_id) DO UPDATE SET display_name = ${displayName}
  `.execute(db);
}

export async function unlinkServeUser(steamId: string) {
  await sql`DELETE FROM serve_users WHERE steam_id = ${steamId}`.execute(db);
}
