import { sql } from 'kysely';
import { db } from 'csdm/node/database/database';

export type MatchWeaponStats = {
  steamId: string;
  name: string;
  weapon: string;
  shots: number;
  hits: number;
  kills: number;
  headshots: number;
  damage: number;
  accuracy: number;
};

type NameRow = {
  steam_id: string;
  name: string;
};

export async function fetchMatchWeapons(checksum: string): Promise<MatchWeaponStats[]> {
  const [namesResult, shotsResult, damagesResult, killsResult] = await Promise.all([
    sql<NameRow>`SELECT DISTINCT ON (steam_id) steam_id, name FROM players WHERE match_checksum = ${checksum}`.execute(
      db,
    ),
    sql<{ steam_id: string; weapon_name: string; shots: number }>`
      SELECT player_steam_id AS steam_id, weapon_name, COUNT(*)::int AS shots
      FROM shots
      WHERE match_checksum = ${checksum}
      GROUP BY player_steam_id, weapon_name
    `.execute(db),
    sql<{ steam_id: string; weapon_name: string; hits: number; damage: number }>`
      SELECT attacker_steam_id AS steam_id, weapon_name, COUNT(*)::int AS hits, COALESCE(SUM(health_damage), 0)::int AS damage
      FROM damages
      WHERE match_checksum = ${checksum}
      GROUP BY attacker_steam_id, weapon_name
    `.execute(db),
    sql<{ steam_id: string; weapon_name: string; kills: number; headshots: number }>`
      SELECT killer_steam_id AS steam_id, weapon_name, COUNT(*)::int AS kills,
        SUM(CASE WHEN is_headshot THEN 1 ELSE 0 END)::int AS headshots
      FROM kills
      WHERE match_checksum = ${checksum}
      GROUP BY killer_steam_id, weapon_name
    `.execute(db),
  ]);

  const names = new Map(namesResult.rows.map((row) => [row.steam_id, row.name]));
  const byKey = new Map<string, MatchWeaponStats>();
  const get = (steamId: string, weapon: string) => {
    const key = `${steamId}|${weapon}`;
    let entry = byKey.get(key);
    if (!entry) {
      entry = {
        steamId,
        name: names.get(steamId) ?? steamId,
        weapon,
        shots: 0,
        hits: 0,
        kills: 0,
        headshots: 0,
        damage: 0,
        accuracy: 0,
      };
      byKey.set(key, entry);
    }
    return entry;
  };

  for (const row of shotsResult.rows) {
    get(row.steam_id, row.weapon_name).shots = Number(row.shots);
  }
  for (const row of damagesResult.rows) {
    const entry = get(row.steam_id, row.weapon_name);
    entry.hits = Number(row.hits);
    entry.damage = Number(row.damage);
  }
  for (const row of killsResult.rows) {
    const entry = get(row.steam_id, row.weapon_name);
    entry.kills = Number(row.kills);
    entry.headshots = Number(row.headshots);
  }
  for (const entry of byKey.values()) {
    entry.accuracy = entry.shots > 0 ? Math.round((entry.hits / entry.shots) * 1000) / 10 : 0;
  }

  return [...byKey.values()].toSorted((a, b) => b.kills - a.kills || b.damage - a.damage);
}

export type MatchGrenadeStats = {
  steamId: string;
  name: string;
  smokes: number;
  flashes: number;
  hes: number;
  molotovs: number;
  decoys: number;
};

export async function fetchMatchGrenades(checksum: string): Promise<MatchGrenadeStats[]> {
  const [namesResult, smokes, flashes, hes, molotovs, decoys] = await Promise.all([
    sql<NameRow>`SELECT DISTINCT ON (steam_id) steam_id, name FROM players WHERE match_checksum = ${checksum}`.execute(
      db,
    ),
    sql<{ steam_id: string; count: number }>`
      SELECT thrower_steam_id AS steam_id, COUNT(*)::int AS count FROM smokes_start
      WHERE match_checksum = ${checksum} GROUP BY thrower_steam_id
    `.execute(db),
    sql<{ steam_id: string; count: number }>`
      SELECT thrower_steam_id AS steam_id, COUNT(*)::int AS count FROM flashbangs_explode
      WHERE match_checksum = ${checksum} GROUP BY thrower_steam_id
    `.execute(db),
    sql<{ steam_id: string; count: number }>`
      SELECT thrower_steam_id AS steam_id, COUNT(*)::int AS count FROM he_grenades_explode
      WHERE match_checksum = ${checksum} GROUP BY thrower_steam_id
    `.execute(db),
    sql<{ steam_id: string; count: number }>`
      SELECT thrower_steam_id AS steam_id, COUNT(DISTINCT unique_id)::int AS count FROM inferno_positions
      WHERE match_checksum = ${checksum} GROUP BY thrower_steam_id
    `.execute(db),
    sql<{ steam_id: string; count: number }>`
      SELECT thrower_steam_id AS steam_id, COUNT(*)::int AS count FROM decoys_start
      WHERE match_checksum = ${checksum} GROUP BY thrower_steam_id
    `.execute(db),
  ]);

  const byId = new Map<string, MatchGrenadeStats>();
  const get = (steamId: string) => {
    let entry = byId.get(steamId);
    if (!entry) {
      entry = {
        steamId,
        name: namesResult.rows.find((row) => row.steam_id === steamId)?.name ?? steamId,
        smokes: 0,
        flashes: 0,
        hes: 0,
        molotovs: 0,
        decoys: 0,
      };
      byId.set(steamId, entry);
    }
    return entry;
  };

  for (const row of smokes.rows) get(row.steam_id).smokes = Number(row.count);
  for (const row of flashes.rows) get(row.steam_id).flashes = Number(row.count);
  for (const row of hes.rows) get(row.steam_id).hes = Number(row.count);
  for (const row of molotovs.rows) get(row.steam_id).molotovs = Number(row.count);
  for (const row of decoys.rows) get(row.steam_id).decoys = Number(row.count);

  return [...byId.values()].toSorted(
    (a, b) =>
      b.smokes + b.flashes + b.hes + b.molotovs + b.decoys - (a.smokes + a.flashes + a.hes + a.molotovs + a.decoys),
  );
}

export type HeatmapPoint = {
  x: number;
  y: number;
  side: number;
  round: number;
  kind: 'kill' | 'death';
};

export async function fetchMatchHeatmap(checksum: string, maxPoints: number): Promise<HeatmapPoint[]> {
  const result = await sql<{ x: number; y: number; side: number; round_number: number; kind: string }>`
    (SELECT killer_x AS x, killer_y AS y, killer_side AS side, round_number, tick, 'kill' AS kind FROM kills WHERE match_checksum = ${checksum})
    UNION ALL
    (SELECT victim_x AS x, victim_y AS y, victim_side AS side, round_number, tick, 'death' AS kind FROM kills WHERE match_checksum = ${checksum})
    ORDER BY tick LIMIT ${maxPoints}
  `.execute(db);

  return result.rows.map((row) => {
    return {
      x: Number(row.x),
      y: Number(row.y),
      side: Number(row.side),
      round: Number(row.round_number),
      kind: row.kind === 'death' ? 'death' : 'kill',
    };
  });
}
