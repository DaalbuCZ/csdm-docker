import path from 'node:path';
import fs from 'fs-extra';

// Keep the large game assets on the existing server volume. The renderer gets
// real directories and private gameinfo files so plugin installation, cfg files,
// and startmovie output cannot write into the dedicated server's installation.
export async function prepareSharedCs2(source: string, destination: string) {
  if (
    !(await fs.pathExists(path.join(source, 'game/cs2.sh'))) ||
    !(await fs.pathExists(path.join(source, 'game/bin/linuxsteamrt64/cs2')))
  ) {
    throw new Error(
      'The shared CS2 installation is missing the Linux client executable or cs2.sh. Install the CS2 client through the worker Steam desktop.',
    );
  }
  async function linkTree(relative: string) {
    await fs.ensureDir(path.join(destination, relative));
    const entries = await fs.readdir(path.join(source, relative), { withFileTypes: true });
    for (const entry of entries) {
      const child = path.join(relative, entry.name);
      // Server configuration, plugins and recordings belong to the server.
      if (entry.name === 'cfg' || entry.name === 'csdm' || entry.name === 'addons' || entry.name.endsWith('.dem'))
        continue;
      const from = path.join(source, child);
      const to = path.join(destination, child);
      if (entry.isDirectory()) {
        await linkTree(child);
      } else if (
        entry.name.endsWith('.gi') ||
        entry.name.endsWith('.sh') ||
        child === path.join('game', 'bin', 'linuxsteamrt64', 'cs2')
      ) {
        await fs.remove(to);
        await fs.copyFile(from, to);
      } else if (!(await fs.pathExists(to))) {
        await fs.symlink(from, to);
      }
    }
  }
  await linkTree('');
  await fs.ensureDir(path.join(destination, 'game/csgo/cfg'));
  return path.join(destination, 'game/cs2.sh');
}
