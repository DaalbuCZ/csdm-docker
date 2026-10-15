import SteamUser from 'steam-user';
import { createInterface } from 'node:readline/promises';
import { Writable } from 'node:stream';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

// Run interactively inside the app container. Credentials never enter Git or
// the Compose file; only a client refresh token is persisted in its volume.
let hidden = false;
const output = new Writable({
  write(chunk, encoding, done) {
    if (!hidden) process.stdout.write(chunk, encoding);
    done();
  },
});
const terminal = createInterface({ input: process.stdin, output, terminal: true });
const accountName = await terminal.question('Steam download account: ');
process.stdout.write('Steam password: ');
hidden = true;
const password = await terminal.question('');
hidden = false;
process.stdout.write('\n');
const client = new SteamUser({ autoRelogin: false, renewRefreshTokens: false, dataDirectory: null });
client.on('steamGuard', async (domain, callback, lastCodeWrong) => {
  if (lastCodeWrong) process.stdout.write('That Steam Guard code was rejected.\n');
  callback(await terminal.question(domain ? `Email Steam Guard code (${domain}): ` : 'Steam Guard code: '));
});
client.on('error', (error) => {
  process.stderr.write(`Login failed: ${error.message}\n`);
  terminal.close();
  process.exitCode = 1;
});
client.once('refreshToken', async (token) => {
  try {
    const file = process.env.STEAM_REFRESH_TOKEN_FILE || '/data/steam/refresh-token';
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, token, { mode: 0o600 });
    process.stdout.write('Steam download credentials saved. Retry failed downloads in the web UI.\n');
  } catch (error) {
    process.stderr.write(`Could not save token: ${error.message}\n`);
    process.exitCode = 1;
  } finally {
    client.logOff();
    terminal.close();
  }
});
client.logOn({ accountName, password });
