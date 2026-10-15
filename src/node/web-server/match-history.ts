import { request } from 'undici';

export type ChainWalkOptions = {
  apiKey: string;
  steamId: string;
  authCode: string;
  startCode: string;
  maxCodes: number;
};

type NextCodeResponse = {
  result?: {
    nextcode?: string;
  };
};

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function getNextMatchSharingCode(options: {
  apiKey: string;
  steamId: string;
  authCode: string;
  knownCode: string;
}): Promise<string | null> {
  const url = new URL('https://api.steampowered.com/ICSGOPlayers_730/GetNextMatchSharingCode/v1');
  url.searchParams.set('key', options.apiKey);
  url.searchParams.set('steamid', options.steamId);
  url.searchParams.set('steamidkey', options.authCode);
  url.searchParams.set('knowncode', options.knownCode);

  const response = await request(url, { method: 'GET', signal: AbortSignal.timeout(30_000) });
  // See https://developer.valvesoftware.com/wiki/Counter-Strike:_Global_Offensive_Access_Match_History
  if (response.statusCode !== 200 && response.statusCode !== 202) await response.body.dump();
  switch (response.statusCode) {
    case 200:
      break;
    case 202:
      await response.body.dump();
      return null;
    case 403:
      throw new Error(
        'Steam rejected the request (403). Check the server STEAM_API_KEY, the authentication code, and that it was generated for this Steam ID.',
      );
    case 412:
      throw new Error(
        'Steam refused the request (412). Check that the authentication code and latest share code belong to this Steam account, and copy the share code with its original casing.',
      );
    case 429:
      throw new Error('Steam rate limit reached (429), try again in a few minutes.');
    default:
      throw new Error(`Steam Web API error ${response.statusCode}.`);
  }
  const body = (await response.body.json()) as NextCodeResponse;
  const next = body?.result?.nextcode;
  if (!next || next === 'n/a') {
    return null;
  }

  return next;
}

// Walks forward from startCode collecting newer share codes, like Leetify does.
// Stops when Steam reports no newer code ('n/a') or maxCodes is reached.
export async function getAllNewMatchCodes(options: ChainWalkOptions): Promise<string[]> {
  const codes: string[] = [];
  let knownCode = options.startCode;

  while (codes.length < options.maxCodes) {
    const next = await getNextMatchSharingCode({
      apiKey: options.apiKey,
      steamId: options.steamId,
      authCode: options.authCode,
      knownCode,
    });
    if (next === null || next === knownCode || codes.includes(next)) {
      break;
    }
    codes.push(next);
    knownCode = next;
    await sleep(1500);
  }

  return codes;
}
