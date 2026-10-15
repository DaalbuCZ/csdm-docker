import { sql } from 'kysely';
import { db } from 'csdm/node/database/database';
import { getClipMaxSeconds, getClipPaddingSeconds } from 'csdm/node/web-server/serve-config';

// On-demand highlight clips. A clip is a tick window around one player's kills
// in a single round, padded with a few seconds of context and clamped to the
// round bounds and a max length. The window doubles as:
// - the 2D viewer range for instant replay + client-side .webm export,
// - an HLAE-compatible sequence (startTick/endTick) for full-quality rendering
//   on a machine with the game installed.
export type HighlightClip = {
  checksum: string;
  roundNumber: number;
  killerSteamId: string;
  killerName: string;
  kind: 'multi-kill' | 'clutch';
  killCount: number;
  startTick: number;
  endTick: number;
  firstKillTick: number;
  lastKillTick: number;
  roundStartTick: number;
  roundEndTick: number;
  tickrate: number;
};

type KillTickRow = {
  tick: number;
  killer_name: string;
};

type RoundTickRow = {
  start_tick: number;
  end_tick: number;
  end_officially_tick: number;
};

type TickrateRow = {
  tickrate: number;
};

export function computeClipWindow(args: {
  roundStartTick: number;
  roundEndTick: number;
  firstKillTick: number;
  lastKillTick: number;
  tickrate: number;
  paddingSeconds: number;
  maxSeconds: number;
}): { startTick: number; endTick: number } {
  const tickrate = args.tickrate > 0 ? args.tickrate : 64;
  const paddingTicks = Math.round(args.paddingSeconds * tickrate);
  const maxTicks = Math.round(args.maxSeconds * tickrate);
  let startTick = Math.max(args.roundStartTick, args.firstKillTick - paddingTicks);
  let endTick = Math.min(args.roundEndTick, args.lastKillTick + paddingTicks);
  if (endTick <= startTick) {
    startTick = args.roundStartTick;
    endTick = args.roundEndTick;
  }
  if (endTick - startTick > maxTicks) {
    // Spend the length budget on the action before trimming context. If the
    // action itself is too long, keep the final decisive kills in the clip.
    const actionTicks = args.lastKillTick - args.firstKillTick;
    const contextTicks = Math.max(0, maxTicks - actionTicks);
    startTick = Math.max(args.roundStartTick, args.firstKillTick - Math.floor(contextTicks / 2));
    endTick = Math.min(args.roundEndTick, startTick + maxTicks);
    if (endTick < args.lastKillTick) {
      endTick = Math.min(args.roundEndTick, args.lastKillTick);
      startTick = Math.max(args.roundStartTick, endTick - maxTicks);
    }
  }
  return { startTick, endTick };
}

async function fetchRoundWindow(checksum: string, roundNumber: number) {
  const result = await sql<RoundTickRow>`
    SELECT start_tick, end_tick, end_officially_tick
    FROM rounds
    WHERE match_checksum = ${checksum} AND number = ${roundNumber}
    LIMIT 1
  `.execute(db);
  const row = result.rows[0];
  if (row === undefined) {
    return null;
  }
  return {
    startTick: Number(row.start_tick),
    endTick: Number(row.end_officially_tick) || Number(row.end_tick),
  };
}

async function fetchTickrate(checksum: string) {
  const result = await sql<TickrateRow>`SELECT tickrate FROM demos WHERE checksum = ${checksum}`.execute(db);
  return Number(result.rows[0]?.tickrate) || 64;
}

export async function fetchHighlightClip(
  checksum: string,
  roundNumber: number,
  killerSteamId: string,
): Promise<HighlightClip | null> {
  const [roundWindow, tickrate, killsResult, clutchResult] = await Promise.all([
    fetchRoundWindow(checksum, roundNumber),
    fetchTickrate(checksum),
    sql<KillTickRow>`
      SELECT tick, killer_name
      FROM kills
      WHERE match_checksum = ${checksum} AND round_number = ${roundNumber} AND killer_steam_id = ${killerSteamId}
      ORDER BY tick
    `.execute(db),
    sql<{ won: boolean; tick: number; clutcher_name: string }>`
      SELECT won, tick, clutcher_name FROM clutches
      WHERE match_checksum = ${checksum} AND round_number = ${roundNumber} AND clutcher_steam_id = ${killerSteamId}
      LIMIT 1
    `.execute(db),
  ]);

  if (roundWindow === null || (killsResult.rows.length === 0 && clutchResult.rows[0]?.won !== true)) {
    return null;
  }

  const ticks = killsResult.rows.map((row) => Number(row.tick));
  const firstKillTick = Math.min(
    ticks[0] ?? roundWindow.endTick,
    clutchResult.rows[0]?.won ? Number(clutchResult.rows[0].tick) : ticks[0],
  );
  const lastKillTick = ticks.at(-1) ?? roundWindow.endTick;
  const { startTick, endTick } = computeClipWindow({
    roundStartTick: roundWindow.startTick,
    roundEndTick: roundWindow.endTick,
    firstKillTick,
    lastKillTick,
    tickrate,
    paddingSeconds: getClipPaddingSeconds(),
    maxSeconds: getClipMaxSeconds(),
  });

  return {
    checksum,
    roundNumber,
    killerSteamId,
    killerName: killsResult.rows[0]?.killer_name ?? clutchResult.rows[0]?.clutcher_name ?? '',
    kind: clutchResult.rows[0]?.won === true ? 'clutch' : 'multi-kill',
    killCount: ticks.length,
    startTick,
    endTick,
    firstKillTick,
    lastKillTick,
    roundStartTick: roundWindow.startTick,
    roundEndTick: roundWindow.endTick,
    tickrate,
  };
}

export type HighlightSequence = {
  number: number;
  checksum: string;
  roundNumber: number;
  killerSteamId: string;
  killerName: string;
  kind: 'multi-kill' | 'clutch';
  startTick: number;
  endTick: number;
};

// Every multi-kill (3+ kills in a round) and won clutch of a match as
// HLAE-compatible tick windows, importable as video sequences.
export async function fetchMatchHighlightSequences(checksum: string): Promise<HighlightSequence[]> {
  const [tickrate, multiKills, clutches] = await Promise.all([
    fetchTickrate(checksum),
    sql<{
      round_number: number;
      killer_steam_id: string;
      killer_name: string;
      kill_count: number;
      first_tick: number;
      last_tick: number;
    }>`
      SELECT round_number, killer_steam_id, killer_name, COUNT(*)::int AS kill_count, MIN(tick)::int AS first_tick, MAX(tick)::int AS last_tick
      FROM kills
      WHERE match_checksum = ${checksum} AND killer_steam_id IS NOT NULL AND killer_steam_id != ''
      GROUP BY round_number, killer_steam_id, killer_name
      HAVING COUNT(*) >= 3
    `.execute(db),
    sql<{ round_number: number; clutcher_steam_id: string; clutcher_name: string; tick: number }>`
      SELECT round_number, clutcher_steam_id, clutcher_name, tick
      FROM clutches
      WHERE match_checksum = ${checksum} AND won = true
    `.execute(db),
  ]);

  const roundsResult = await sql<{ number: number; start_tick: number; end_tick: number; end_officially_tick: number }>`
    SELECT number, start_tick, end_tick, end_officially_tick
    FROM rounds
    WHERE match_checksum = ${checksum}
  `.execute(db);
  const roundByNumber = new Map(
    roundsResult.rows.map((row) => [
      Number(row.number),
      {
        startTick: Number(row.start_tick),
        endTick: Number(row.end_officially_tick) || Number(row.end_tick),
      },
    ]),
  );

  const sequences: HighlightSequence[] = [];
  let number = 1;
  const push = (
    roundNumber: number,
    killerSteamId: string,
    killerName: string,
    kind: 'multi-kill' | 'clutch',
    firstKillTick: number,
    lastKillTick: number,
  ) => {
    const round = roundByNumber.get(roundNumber);
    if (round === undefined) {
      return;
    }
    const { startTick, endTick } = computeClipWindow({
      roundStartTick: round.startTick,
      roundEndTick: round.endTick,
      firstKillTick,
      lastKillTick,
      tickrate,
      paddingSeconds: getClipPaddingSeconds(),
      maxSeconds: getClipMaxSeconds(),
    });
    sequences.push({
      number: number++,
      checksum,
      roundNumber,
      killerSteamId,
      killerName,
      kind,
      startTick,
      endTick,
    });
  };

  for (const row of multiKills.rows) {
    push(
      Number(row.round_number),
      row.killer_steam_id,
      row.killer_name,
      'multi-kill',
      Number(row.first_tick),
      Number(row.last_tick),
    );
  }
  for (const row of clutches.rows) {
    const existing = sequences.find(
      (sequence) =>
        sequence.roundNumber === Number(row.round_number) && sequence.killerSteamId === row.clutcher_steam_id,
    );
    if (existing) {
      existing.kind = 'clutch';
      continue;
    }
    const clip = await fetchHighlightClip(checksum, Number(row.round_number), row.clutcher_steam_id);
    if (!clip) continue;
    sequences.push({
      number: number++,
      checksum,
      roundNumber: Number(row.round_number),
      killerSteamId: row.clutcher_steam_id,
      killerName: row.clutcher_name,
      kind: 'clutch',
      startTick: clip.startTick,
      endTick: clip.endTick,
    });
  }

  return sequences
    .sort((a, b) => a.roundNumber - b.roundNumber)
    .map((sequence, index) => ({ ...sequence, number: index + 1 }));
}
