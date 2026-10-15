import { sql } from 'kysely';
import { db } from 'csdm/node/database/database';
import { getStaticFolderPath } from 'csdm/node/filesystem/get-static-folder-path';
import fs from 'fs-extra';
import path from 'node:path';

export type ViewerPosition = {
  tick: number;
  steamId: string;
  name: string;
  side: number;
  x: number;
  y: number;
  yaw: number;
  isAlive: boolean;
  health: number;
  hasBomb: boolean;
};

export async function fetchViewerPositions(
  checksum: string,
  roundNumber: number,
  tickStride: number,
): Promise<ViewerPosition[]> {
  const rows = await db
    .selectFrom((qb) =>
      qb
        .selectFrom('player_positions')
        .selectAll()
        .select(sql<number>`dense_rank() over (order by tick)`.as('sample_index'))
        .where('match_checksum', '=', checksum)
        .where('round_number', '=', roundNumber)
        .as('sampled'),
    )
    .select([
      'tick',
      'player_steam_id as steamId',
      'player_name as name',
      'side',
      'x',
      'y',
      'yaw',
      'is_alive as isAlive',
      'health',
      'has_bomb as hasBomb',
    ])
    .where('match_checksum', '=', checksum)
    .where('round_number', '=', roundNumber)
    .where(sql`(sample_index - 1) % ${tickStride}`, '=', 0)
    .orderBy('tick')
    .orderBy('player_steam_id')
    .execute();

  return rows.map((row) => {
    return {
      tick: row.tick,
      steamId: row.steamId,
      name: row.name,
      side: Number(row.side),
      x: Number(row.x),
      y: Number(row.y),
      yaw: Number(row.yaw),
      isAlive: Boolean(row.isAlive),
      health: Number(row.health),
      hasBomb: Boolean(row.hasBomb),
    };
  });
}

export type MapTransform = {
  posX: number;
  posY: number;
  scale: number;
  radarSize: number;
  radarUrl: string;
};

function sanitizeMapName(name: string) {
  return name.toLowerCase().replaceAll(/[^a-z0-9_]/g, '');
}

export function getRadarFilePath(game: string, mapName: string) {
  const folder = game.toLowerCase().startsWith('cs2') ? 'cs2' : 'csgo';
  const fileName = `${sanitizeMapName(mapName)}.png`;
  return path.join(getStaticFolderPath(), 'images', 'maps', folder, 'radars', fileName);
}

function readPngWidth(filePath: string): number | null {
  try {
    const handle = fs.openSync(filePath, 'r');
    try {
      const buffer = Buffer.alloc(24);
      fs.readSync(handle, buffer, 0, 24, 0);
      if (buffer[0] !== 0x89 || buffer[1] !== 0x50) {
        return null;
      }
      return buffer.readUInt32BE(16);
    } finally {
      fs.closeSync(handle);
    }
  } catch {
    return null;
  }
}

export async function fetchMapTransform(game: string, mapName: string): Promise<MapTransform | null> {
  const folder = game.toLowerCase().startsWith('cs2') ? 'cs2' : 'csgo';
  const dbGame = folder === 'cs2' ? 'CS2' : 'CSGO';
  const byGame = await db
    .selectFrom('maps')
    .select(['position_x', 'position_y', 'scale'])
    .where('name', '=', mapName.toLowerCase())
    .where('game', '=', dbGame)
    .executeTakeFirst();
  const row =
    byGame ??
    (await db
      .selectFrom('maps')
      .select(['position_x', 'position_y', 'scale'])
      .where('name', '=', mapName.toLowerCase())
      .executeTakeFirst());

  if (row === undefined) {
    return null;
  }

  const radarFilePath = getRadarFilePath(game, mapName);
  const radarExists = await fs.pathExists(radarFilePath);
  if (!radarExists) {
    return null;
  }
  const radarSize = readPngWidth(radarFilePath) ?? 1024;

  return {
    posX: Number(row.position_x),
    posY: Number(row.position_y),
    scale: Number(row.scale),
    radarSize,
    radarUrl: `/static/radars/${folder}/${sanitizeMapName(mapName)}.png`,
  };
}

export type PlayerHistoryEntry = {
  date: string;
  mapName: string;
  checksum: string;
  killCount: number;
  deathCount: number;
  assistCount: number;
  adr: number;
  kast: number;
  rating2: number;
  headshotPercentage: number;
};

export type PlayerHistoryFilters = {
  limit: number;
  mapName?: string;
  startDate?: string;
  endDate?: string;
};

export async function fetchPlayerHistory(
  steamId: string,
  filters: number | PlayerHistoryFilters,
): Promise<PlayerHistoryEntry[]> {
  const { limit, mapName, startDate, endDate } =
    typeof filters === 'number'
      ? { limit: filters, mapName: undefined, startDate: undefined, endDate: undefined }
      : filters;
  let query = db
    .selectFrom('players')
    .innerJoin('demos', 'demos.checksum', 'players.match_checksum')
    .select([
      'players.match_checksum as checksum',
      'demos.map_name as mapName',
      'demos.date',
      'players.kill_count as killCount',
      'players.death_count as deathCount',
      'players.assist_count as assistCount',
      'players.average_damage_per_round as adr',
      'players.kast',
      'players.hltv_rating_2 as rating2',
      'players.headshot_percentage as headshotPercentage',
    ])
    .where('players.steam_id', '=', steamId)
    // Order descending first so the limit keeps the most recent matches, then
    // reverse to chronological order for the form chart.
    .orderBy('demos.date', 'desc')
    .$if(mapName !== undefined && mapName !== '', (qb) => qb.where('demos.map_name', '=', mapName!))
    .$if(startDate !== undefined && startDate !== '' && endDate !== undefined && endDate !== '', (qb) =>
      qb.where(sql<boolean>`demos.date between ${startDate} and ${endDate}`),
    )
    .limit(limit);

  const rows = await query.execute();

  return rows.reverse().map((row) => {
    return {
      date: (row.date as Date).toISOString(),
      mapName: row.mapName,
      checksum: row.checksum,
      killCount: Number(row.killCount),
      deathCount: Number(row.deathCount),
      assistCount: Number(row.assistCount),
      adr: Number(row.adr),
      kast: Number(row.kast),
      rating2: Number(row.rating2),
      headshotPercentage: Number(row.headshotPercentage),
    };
  });
}

type ViewerDetonation = {
  tick: number;
  x: number;
  y: number;
};

type ViewerInferno = {
  tick: number;
  x: number;
  y: number;
  id: string;
  hull: number[];
};

type ViewerTrajectory = {
  id: string;
  name: string;
  points: { tick: number; x: number; y: number }[];
};

type ViewerBombEvent = {
  tick: number;
  x: number;
  y: number;
  site: string;
  defuser?: string;
  planter?: string;
  started?: number | null;
} | null;

type ViewerExplosion = {
  tick: number;
  x: number;
  y: number;
} | null;

export type ViewerGrenades = {
  smokes: ViewerDetonation[];
  flashes: ViewerDetonation[];
  hes: ViewerDetonation[];
  infernos: ViewerInferno[];
  trajectories: ViewerTrajectory[];
  planted: ViewerBombEvent;
  defused: ViewerBombEvent;
  exploded: ViewerExplosion;
};

export async function fetchViewerGrenades(
  checksum: string,
  roundNumber: number,
  tickStride: number,
): Promise<ViewerGrenades> {
  const [smokes, flashes, hes, infernos, trajectoriesRows, plantedRows, defusedRows, explodedRows] = await Promise.all([
    sql<ViewerDetonation>`SELECT tick, x, y FROM smokes_start WHERE match_checksum = ${checksum} AND round_number = ${roundNumber} ORDER BY tick`.execute(
      db,
    ),
    sql<ViewerDetonation>`SELECT tick, x, y FROM flashbangs_explode WHERE match_checksum = ${checksum} AND round_number = ${roundNumber} ORDER BY tick`.execute(
      db,
    ),
    sql<ViewerDetonation>`SELECT tick, x, y FROM he_grenades_explode WHERE match_checksum = ${checksum} AND round_number = ${roundNumber} ORDER BY tick`.execute(
      db,
    ),
    sql<{
      tick: number;
      x: number;
      y: number;
      id: string;
      hull: string;
    }>`SELECT tick, x, y, unique_id AS id, convex_hull_2d AS hull FROM (SELECT *, row_number() over (partition by unique_id order by tick) AS sample_index FROM inferno_positions WHERE match_checksum = ${checksum} AND round_number = ${roundNumber}) sampled WHERE (sample_index - 1) % ${tickStride} = 0 ORDER BY tick`.execute(
      db,
    ),
    sql<{
      tick: number;
      id: string;
      name: string;
      x: number;
      y: number;
    }>`SELECT tick, projectile_id AS id, grenade_name AS name, x, y FROM (SELECT *, row_number() over (partition by projectile_id order by tick) AS sample_index FROM grenade_positions WHERE match_checksum = ${checksum} AND round_number = ${roundNumber}) sampled WHERE (sample_index - 1) % ${tickStride} = 0 ORDER BY id, tick`.execute(
      db,
    ),
    sql<{
      tick: number;
      x: number;
      y: number;
      site: string;
      planter: string;
      started: number | null;
    }>`SELECT p.tick, p.x, p.y, p.site, p.planter_name AS planter, (SELECT MAX(tick) FROM bombs_plant_start s WHERE s.match_checksum = p.match_checksum AND s.round_number = p.round_number AND s.tick <= p.tick) AS started FROM bombs_planted p WHERE p.match_checksum = ${checksum} AND p.round_number = ${roundNumber} ORDER BY p.tick LIMIT 1`.execute(
      db,
    ),
    sql<{
      tick: number;
      x: number;
      y: number;
      site: string;
      defuser: string;
      started: number | null;
    }>`SELECT d.tick, d.x, d.y, d.site, d.defuser_name AS defuser, (SELECT MAX(tick) FROM bombs_defuse_start s WHERE s.match_checksum = d.match_checksum AND s.round_number = d.round_number AND s.tick <= d.tick) AS started FROM bombs_defused d WHERE d.match_checksum = ${checksum} AND d.round_number = ${roundNumber} ORDER BY d.tick LIMIT 1`.execute(
      db,
    ),
    sql<{
      tick: number;
      x: number;
      y: number;
    }>`SELECT tick, x, y FROM bombs_exploded WHERE match_checksum = ${checksum} AND round_number = ${roundNumber} ORDER BY tick LIMIT 1`.execute(
      db,
    ),
  ]);

  const toDetonations = (rows: { tick: number; x: number; y: number }[]): ViewerDetonation[] => {
    return rows.map((row) => {
      return { tick: Number(row.tick), x: Number(row.x), y: Number(row.y) };
    });
  };
  const planted = plantedRows.rows[0];
  const defused = defusedRows.rows[0];
  const exploded = explodedRows.rows[0];

  return {
    smokes: toDetonations(smokes.rows),
    flashes: toDetonations(flashes.rows),
    hes: toDetonations(hes.rows),
    infernos: infernos.rows.map((row) => {
      const hull = row.hull
        .split(',')
        .map(Number)
        .filter((value) => Number.isFinite(value));
      return {
        tick: Number(row.tick),
        x: Number(row.x),
        y: Number(row.y),
        id: row.id,
        hull: hull.length >= 6 && hull.length % 2 === 0 ? hull : [],
      };
    }),
    trajectories: buildTrajectories(trajectoriesRows.rows),
    planted: planted
      ? {
          tick: Number(planted.tick),
          x: Number(planted.x),
          y: Number(planted.y),
          site: planted.site,
          planter: planted.planter,
          started: planted.started === null ? null : Number(planted.started),
        }
      : null,
    defused: defused
      ? {
          tick: Number(defused.tick),
          x: Number(defused.x),
          y: Number(defused.y),
          site: defused.site,
          defuser: defused.defuser,
          started: defused.started === null ? null : Number(defused.started),
        }
      : null,
    exploded: exploded ? { tick: Number(exploded.tick), x: Number(exploded.x), y: Number(exploded.y) } : null,
  };
}

function buildTrajectories(
  rows: { tick: number; id: string; name: string; x: number; y: number }[],
): ViewerTrajectory[] {
  const byId = new Map<string, ViewerTrajectory>();
  for (const row of rows) {
    let trajectory = byId.get(row.id);
    if (!trajectory) {
      trajectory = { id: row.id, name: row.name, points: [] };
      byId.set(row.id, trajectory);
    }
    trajectory.points.push({ tick: Number(row.tick), x: Number(row.x), y: Number(row.y) });
  }
  return [...byId.values()];
}

export type ViewerShot = {
  tick: number;
  x: number;
  y: number;
  yaw: number;
  side: number;
  weapon: string;
};

export async function fetchViewerShots(checksum: string, roundNumber: number): Promise<ViewerShot[]> {
  const result =
    await sql<ViewerShot>`SELECT tick, x, y, player_yaw AS yaw, player_side AS side, weapon_name AS weapon FROM shots WHERE match_checksum = ${checksum} AND round_number = ${roundNumber} ORDER BY tick`.execute(
      db,
    );

  return result.rows.map((row) => {
    return {
      tick: Number(row.tick),
      x: Number(row.x),
      y: Number(row.y),
      yaw: Number(row.yaw),
      side: Number(row.side),
      weapon: row.weapon,
    };
  });
}

export async function fetchRoundTickrate(checksum: string): Promise<number> {
  const result = await sql<{ tickrate: number }>`SELECT tickrate FROM demos WHERE checksum = ${checksum}`.execute(db);
  return Number(result.rows[0]?.tickrate) || 64;
}
