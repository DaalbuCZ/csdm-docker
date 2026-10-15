import { build } from 'esbuild';

const common = {
  bundle: true,
  packages: 'external',
  alias: { csdm: './src' },
  define: {
    IS_DEV: 'false',
    IS_PRODUCTION: 'true',
    APP_VERSION: '"docker"',
    'process.env.STEAM_API_KEYS': '""',
    'process.env.FACEIT_API_KEY': '""',
    REACT_STRICT_MODE_ENABLED: 'false',
  },
  platform: 'node',
  format: 'cjs',
  logLevel: 'warning',
  external: ['*.node'],
};
await build({ ...common, entryPoints: ['src/cli/cli.ts'], outfile: 'out/cli.cjs' });
await build({ ...common, entryPoints: ['src/node/web-server/render-worker.ts'], outfile: 'out/render-worker.cjs' });
