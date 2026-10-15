import { request } from 'undici';

const STEAM_OPENID_URL = 'https://steamcommunity.com/openid/login';

export function getSteamLoginUrl(publicUrl: string) {
  const params = new URLSearchParams({
    'openid.ns': 'http://specs.openid.net/auth/2.0',
    'openid.mode': 'checkid_setup',
    'openid.return_to': `${publicUrl}/auth/steam/callback`,
    'openid.realm': publicUrl,
    'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
    'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select',
  });

  return `${STEAM_OPENID_URL}?${params.toString()}`;
}

export async function verifySteamCallback(callbackUrl: URL): Promise<string | null> {
  const params = new URLSearchParams();
  for (const [key, value] of callbackUrl.searchParams) {
    if (key.startsWith('openid.')) {
      params.set(key, value);
    }
  }
  params.set('openid.mode', 'check_authentication');

  const response = await request(STEAM_OPENID_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  const text = await response.body.text();
  if (!text.includes('is_valid:true')) {
    return null;
  }

  const claimedId = callbackUrl.searchParams.get('openid.claimed_id') ?? '';
  const match = claimedId.match(/\/id\/(\d+)$/);
  return match ? match[1] : null;
}
