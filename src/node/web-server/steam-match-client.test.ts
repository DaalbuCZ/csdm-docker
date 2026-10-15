import { EventEmitter } from 'node:events';
import { describe, it, expect, vi, afterEach } from 'vite-plus/test';
import SteamUser from 'steam-user';
import GlobalOffensive from 'globaloffensive';
import { encodeMatch } from 'csgo-sharecode';
import { fetchSteamMatch } from './steam-match-client';

vi.mock('steam-user', () => ({ default: vi.fn() }));
vi.mock('globaloffensive', () => ({ default: vi.fn() }));

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe('headless demo resolution', () => {
  it('waits for the coordinator and preserves 64-bit match IDs', async () => {
    vi.stubEnv('STEAM_REFRESH_TOKEN', 'test-token');
    const client = Object.assign(new EventEmitter(), { logOn: vi.fn(), logOff: vi.fn(), gamesPlayed: vi.fn() });
    const coordinator = Object.assign(new EventEmitter(), { requestGame: vi.fn() });
    vi.mocked(SteamUser).mockImplementation(function () {
      return client;
    } as unknown as typeof SteamUser);
    vi.mocked(GlobalOffensive).mockImplementation(function () {
      return coordinator;
    } as unknown as typeof GlobalOffensive);
    const matchId = 3842557744804528765n;
    const shareCode = encodeMatch({ matchId, reservationId: 1234567890123456789n, tvPort: 1234 });
    const pending = fetchSteamMatch(shareCode);
    expect(client.logOn).toHaveBeenCalledWith({ refreshToken: 'test-token' });
    expect(coordinator.requestGame).not.toHaveBeenCalled();
    client.emit('loggedOn');
    expect(client.gamesPlayed).toHaveBeenCalledWith([730]);
    coordinator.emit('connectedToGC');
    expect(coordinator.requestGame).toHaveBeenCalledWith(shareCode);
    coordinator.emit('matchList', [
      { matchid: matchId.toString(), roundstatsall: [{ map: 'http://replay.valve.net/test.dem.bz2' }] },
    ]);
    const result = await pending;
    expect(result.matchid).toBe(matchId);
    expect(result.roundstatsall[0].map).toBe('http://replay.valve.net/test.dem.bz2');
    expect(client.logOff).toHaveBeenCalledOnce();
  });

  it('ends the Steam session when lookup times out', async () => {
    vi.useFakeTimers();
    vi.stubEnv('STEAM_REFRESH_TOKEN', 'test-token');
    const client = Object.assign(new EventEmitter(), { logOn: vi.fn(), logOff: vi.fn(), gamesPlayed: vi.fn() });
    const coordinator = Object.assign(new EventEmitter(), { requestGame: vi.fn() });
    vi.mocked(SteamUser).mockImplementation(function () {
      return client;
    } as unknown as typeof SteamUser);
    vi.mocked(GlobalOffensive).mockImplementation(function () {
      return coordinator;
    } as unknown as typeof GlobalOffensive);
    const pending = fetchSteamMatch(encodeMatch({ matchId: 1n, reservationId: 2n, tvPort: 3 }));
    const rejected = expect(pending).rejects.toThrow('timed out');
    await vi.advanceTimersByTimeAsync(90_000);
    await rejected;
    expect(client.logOff).toHaveBeenCalledOnce();
  });
});
