import crypto from 'node:crypto';

const SESSION_COOKIE_NAME = 'csdm_session';
const SESSION_TTL_MS = 30 * 24 * 3600 * 1000;

function sign(steamId: string, expiresAt: number, secret: string) {
  return crypto.createHmac('sha256', secret).update(`${steamId}.${expiresAt}`).digest('hex');
}

function buildSessionCookieValue(steamId: string, secret: string) {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  return `${steamId}.${expiresAt}.${sign(steamId, expiresAt, secret)}`;
}

export function getSessionSteamId(cookieHeader: string | undefined, secret: string): string | null {
  if (!cookieHeader || secret === '') {
    return null;
  }
  const cookies = cookieHeader.split(';').map((part) => part.trim());
  const session = cookies.find((part) => part.startsWith(`${SESSION_COOKIE_NAME}=`));
  if (session === undefined) {
    return null;
  }
  const value = decodeURIComponent(session.slice(SESSION_COOKIE_NAME.length + 1));
  const [steamId, expiresAtRaw, signature] = value.split('.');
  const expiresAt = Number(expiresAtRaw);
  if (!steamId || !Number.isSafeInteger(expiresAt) || !signature) {
    return null;
  }
  if (Date.now() > expiresAt) {
    return null;
  }
  const expected = sign(steamId, expiresAt, secret);
  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return null;
  }

  return steamId;
}

export function buildSetSessionCookieHeader(steamId: string, secret: string) {
  return `${SESSION_COOKIE_NAME}=${encodeURIComponent(buildSessionCookieValue(steamId, secret))}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL_MS / 1000}`;
}

export function buildClearSessionCookieHeader() {
  return `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}
