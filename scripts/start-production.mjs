import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

// Wrangler resolves default state relative to its config directory. Keep the
// compiled Worker on the same explicitly migrated local database as development.
const result = spawnSync(
  process.execPath,
  [
    resolve('node_modules/wrangler/bin/wrangler.js'),
    'dev',
    '--config', resolve('dist/server/wrangler.json'),
    '--persist-to', resolve('.wrangler/state'),
    ...process.argv.slice(2),
  ],
  { stdio: 'inherit' },
);
if (result.error) throw result.error;
process.exit(result.status ?? 1);
