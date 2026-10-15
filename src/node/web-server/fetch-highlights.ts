import { searchClutches } from 'csdm/node/database/search/search-clutches';
import { searchMultiKills } from 'csdm/node/database/search/search-multi-kills';
import type { ClutchResult } from 'csdm/common/types/search/clutch-result';
import type { MultiKillResult } from 'csdm/common/types/search/multi-kill-result';

export type Highlight = {
  kind: 'clutch' | 'multi-kill';
  matchChecksum: string;
  mapName: string;
  date: string;
  roundNumber: number;
  tick: number;
  killerName: string;
  killerSteamId: string;
  detail: string;
};

function buildBaseFilter(steamId: string | undefined, mapName: string | undefined) {
  return {
    steamIds: steamId ? [steamId] : [],
    victimSteamIds: [],
    mapNames: mapName ? [mapName] : [],
    startDate: undefined,
    endDate: undefined,
    demoSources: [],
    weaponNames: [],
    roundTagIds: [],
    matchTagIds: [],
  };
}

function clutchToHighlight(clutch: ClutchResult): Highlight {
  return {
    kind: 'clutch',
    matchChecksum: clutch.matchChecksum,
    mapName: clutch.mapName,
    date: clutch.date,
    roundNumber: clutch.roundNumber,
    tick: clutch.tick,
    killerName: clutch.clutcherName,
    killerSteamId: clutch.clutcherSteamId,
    detail: `1v${clutch.opponentCount} clutch`,
  };
}

function multiKillToHighlight(multiKill: MultiKillResult): Highlight {
  return {
    kind: 'multi-kill',
    matchChecksum: multiKill.matchChecksum,
    mapName: multiKill.mapName,
    date: multiKill.date,
    roundNumber: multiKill.roundNumber,
    tick: multiKill.tick,
    killerName: multiKill.killerName,
    killerSteamId: multiKill.killerSteamId,
    detail: `${multiKill.kills.length} kills in round ${multiKill.roundNumber}`,
  };
}

export type HighlightsFilter = {
  kind?: 'clutch' | 'multi-kill';
  mapName?: string;
};

export async function fetchHighlights(
  steamId: string | undefined,
  limit: number,
  filter: HighlightsFilter = {},
): Promise<Highlight[]> {
  const base = buildBaseFilter(steamId, filter.mapName);
  const wantClutches = filter.kind === undefined || filter.kind === 'clutch';
  const wantMultiKills = filter.kind === undefined || filter.kind === 'multi-kill';
  const [clutches, threeKills, fourKills, fiveKills] = await Promise.all([
    wantClutches
      ? Promise.all(([1, 2, 3, 4, 5] as const).map((opponentCount) => searchClutches({ ...base, opponentCount }))).then(
          (groups) => groups.flat(),
        )
      : Promise.resolve([]),
    wantMultiKills ? searchMultiKills({ ...base, killCount: 3 }) : Promise.resolve([]),
    wantMultiKills ? searchMultiKills({ ...base, killCount: 4 }) : Promise.resolve([]),
    wantMultiKills ? searchMultiKills({ ...base, killCount: 5 }) : Promise.resolve([]),
  ]);

  const highlights: Highlight[] = [
    ...clutches.map(clutchToHighlight),
    ...threeKills.map(multiKillToHighlight),
    ...fourKills.map(multiKillToHighlight),
    ...fiveKills.map(multiKillToHighlight),
  ];

  highlights.sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  return highlights.slice(0, limit);
}
