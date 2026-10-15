import { describe, it, expect } from 'vite-plus/test';
import { buildDiscordMatchPayload } from './discord';

describe('buildDiscordMatchPayload', () => {
  it('should build an embed with score, MVP and highlights', () => {
    const payload = buildDiscordMatchPayload({
      mapName: 'de_mirage',
      date: '2026-01-01T00:00:00.000Z',
      teamAName: 'Team A',
      teamBName: 'Team B',
      teamAScore: 13,
      teamBScore: 9,
      killCount: 120,
      mvpName: 'Player',
      mvpRating: 1.234,
      highlightCount: 4,
      matchUrl: 'http://localhost:3000/#/matches/abc',
    });

    expect(payload.embeds).toHaveLength(1);
    expect(payload.embeds[0].title).toBe('Match analyzed — de_mirage');
    expect(payload.embeds[0].description).toContain('Team A 13 : 9 Team B');
    expect(payload.embeds[0].description).toContain('MVP Player (1.23)');
  });

  it('should report a draw when scores are equal', () => {
    const payload = buildDiscordMatchPayload({
      mapName: 'de_dust2',
      date: '',
      teamAName: 'A',
      teamBName: 'B',
      teamAScore: 12,
      teamBScore: 12,
      killCount: 0,
      mvpName: '-',
      mvpRating: 0,
      highlightCount: 0,
      matchUrl: '',
    });

    expect(payload.embeds[0].description).toContain('Winner: Draw');
  });
});
