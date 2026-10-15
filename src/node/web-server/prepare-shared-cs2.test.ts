import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';
import { describe, it, expect } from 'vite-plus/test';
import { prepareSharedCs2 } from './prepare-shared-cs2';

describe('shared CS2 installation', () => {
  it('shares binary assets while keeping renderer configuration and output private', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'csdm-shared-'));
    try {
      const source = path.join(root, 'server');
      const destination = path.join(root, 'renderer');
      await fs.outputFile(path.join(source, 'game/cs2.sh'), 'launcher');
      await fs.outputFile(path.join(source, 'game/bin/linuxsteamrt64/cs2'), 'binary');
      await fs.outputFile(path.join(source, 'game/csgo/pak01.vpk'), 'assets');
      await fs.outputFile(path.join(source, 'game/csgo/gameinfo.gi'), 'gameinfo');
      await fs.outputFile(path.join(source, 'game/csgo/cfg/server.cfg'), 'server-only');
      await prepareSharedCs2(source, destination);
      expect((await fs.lstat(path.join(destination, 'game/csgo/pak01.vpk'))).isSymbolicLink()).toBe(true);
      expect((await fs.lstat(path.join(destination, 'game/csgo/gameinfo.gi'))).isSymbolicLink()).toBe(false);
      await fs.writeFile(path.join(destination, 'game/csgo/gameinfo.gi'), 'renderer');
      expect(await fs.readFile(path.join(source, 'game/csgo/gameinfo.gi'), 'utf8')).toBe('gameinfo');
      expect(await fs.pathExists(path.join(destination, 'game/csgo/cfg/server.cfg'))).toBe(false);
    } finally {
      await fs.remove(root);
    }
  });
});
