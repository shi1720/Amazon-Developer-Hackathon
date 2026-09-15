import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
if (
  !/^(127\.0\.0\.1|localhost|\[::1\]):\d+$/.test(
    process.env.FIRESTORE_EMULATOR_HOST ?? '',
  )
)
  throw new Error(
    'Start the local Firestore emulator before running this suite.',
  );
const result = spawnSync(
  process.execPath,
  [
    resolve('node_modules/vitest/vitest.mjs'),
    'run',
    '--config',
    'vitest.integration.config.ts',
  ],
  {
    env: { ...process.env, GCLOUD_PROJECT: 'demo-kindhandoff-backend-tests' },
    stdio: 'inherit',
  },
);
if (result.error) throw result.error;
process.exit(result.status ?? 1);
