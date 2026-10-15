import crypto from 'node:crypto';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import fs from 'fs-extra';
import bzip2 from 'unbzip2-stream';

async function readHeader(file: string) {
  const handle = await fs.open(file, 'r');
  try {
    const header = Buffer.alloc(8);
    await fs.read(handle, header, 0, header.length, 0);
    return header.toString('ascii');
  } finally {
    await fs.close(handle);
  }
}

function isDemo(header: string) {
  return header === 'PBDEMS2\0' || header === 'HL2DEMO\0';
}

export async function prepareDemoFile(file: string) {
  const header = await readHeader(file);
  if (isDemo(header)) return file;
  if (!header.startsWith('BZh')) throw new Error('This file is not a Counter-Strike demo or a bzip2 demo archive.');
  const stats = await fs.stat(file);
  const fingerprint = crypto.createHash('sha256').update(`${file}:${stats.size}:${stats.mtimeMs}`).digest('hex');
  const output = path.join(path.dirname(file), 'extracted', `${fingerprint}.dem`);
  if (await fs.pathExists(output)) return output;
  await fs.ensureDir(path.dirname(output));
  const partial = `${output}.part`;
  try {
    await pipeline(fs.createReadStream(file), bzip2(), fs.createWriteStream(partial));
    if (!isDemo(await readHeader(partial))) throw new Error('The archive does not contain a Counter-Strike demo.');
    await fs.move(partial, output, { overwrite: true });
    return output;
  } catch (error) {
    await fs.remove(partial);
    throw error;
  }
}
