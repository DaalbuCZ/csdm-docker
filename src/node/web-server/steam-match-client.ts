import fs from 'fs-extra';
import SteamUser from 'steam-user';
import GlobalOffensive from 'globaloffensive';
import { decodeMatchShareCode } from 'csgo-sharecode';
import { CDataGCCStrike15_v2_MatchInfoSchema, fromJson, type CDataGCCStrike15_v2_MatchInfo } from 'csgo-protobuf';

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

// The desktop boiler requires a running Steam client. A hosted server instead
// authenticates directly with Steam and requests the demo URL from the CS GC.
export async function fetchSteamMatch(shareCode: string): Promise<CDataGCCStrike15_v2_MatchInfo> {
  const refreshToken =
    process.env.STEAM_REFRESH_TOKEN?.trim() ||
    (
      await fs.readFile(process.env.STEAM_REFRESH_TOKEN_FILE || '/data/steam/refresh-token', 'utf8').catch(() => '')
    ).trim();
  if (!refreshToken) {
    return Promise.reject(
      new Error(
        'Set STEAM_REFRESH_TOKEN for headless demo downloads. A Steam Web API key alone cannot download demos.',
      ),
    );
  }
  const { matchId } = decodeMatchShareCode(shareCode);
  return new Promise((resolve, reject) => {
    const client = new SteamUser({ autoRelogin: false, renewRefreshTokens: false, dataDirectory: null });
    const coordinator = new GlobalOffensive(client);
    let settled = false;
    const finish = (error?: Error, match?: CDataGCCStrike15_v2_MatchInfo) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      client.logOff();
      if (error) reject(error);
      else if (match) resolve(match);
    };
    const timeout = setTimeout(
      () => finish(new Error('Steam demo lookup timed out. Check the download account and retry.')),
      90_000,
    );
    client.on('error', (error: Error) => finish(error));
    client.on('disconnected', () => finish(new Error('Steam disconnected during demo lookup.')));
    client.on('steamGuard', () =>
      finish(new Error('Steam requires authentication. Generate a new client refresh token.')),
    );
    client.once('loggedOn', () => client.gamesPlayed([730]));
    coordinator.once('connectedToGC', () => coordinator.requestGame(shareCode));
    coordinator.on('matchList', (matches: unknown[]) => {
      try {
        for (const raw of matches) {
          // protobufjs serializes its 64-bit integers as decimal strings. Use
          // protobuf JSON decoding rather than converting them through Number.
          const json = JSON.parse(JSON.stringify(raw)) as JsonValue;
          const match = fromJson(CDataGCCStrike15_v2_MatchInfoSchema, json, { ignoreUnknownFields: true });
          if (match.matchid === matchId) {
            finish(undefined, match);
            return;
          }
        }
        if (matches.length === 0) finish(new Error('Steam returned no demo for this share code; it may have expired.'));
      } catch (error) {
        finish(error instanceof Error ? error : new Error('Invalid Steam match response.'));
      }
    });
    try {
      client.logOn({ refreshToken });
    } catch (error) {
      finish(error instanceof Error ? error : new Error('Steam login failed.'));
    }
  });
}
