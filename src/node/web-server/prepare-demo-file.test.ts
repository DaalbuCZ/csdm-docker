import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';
import { describe, it, expect } from 'vite-plus/test';
import { prepareDemoFile } from './prepare-demo-file';

describe('compressed demo imports', () => {
  it('detects bzip2 despite a .dem extension and publishes a decompressed demo atomically', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'csdm-archive-'));
    try {
      const input = path.join(root, 'replay.dem');
      await fs.writeFile(
        input,
        Buffer.from(
          'QlpoOTFBWSZTWVKY/lQAAAPfgEAAAAIQABYCSAAmBsBAIAAxQ00wAFMmg0xqeosO+t8HTAFGvGy/F3JFOFCQUpj+VA==',
          'base64',
        ),
      );
      const output = await prepareDemoFile(input);
      expect(await fs.readFile(output, 'utf8')).toBe('PBDEMS2\0example-demo');
      expect(await fs.pathExists(`${output}.part`)).toBe(false);
      expect(await prepareDemoFile(input)).toBe(output);
      expect((await fs.readFile(input)).subarray(0, 3).toString()).toBe('BZh');
    } finally {
      await fs.remove(root);
    }
  });
});
