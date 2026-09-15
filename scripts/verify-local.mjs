import { spawn } from 'node:child_process';
import { setTimeout } from 'node:timers/promises';
const port = process.env.PORT ?? '3001';
const base = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['functions/lib/local.mjs'], {
  env: {
    ...process.env,
    PORT: port,
    PUBLIC_ORIGIN: base,
    GCLOUD_PROJECT: 'demo-kindhandoff',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let log = '';
server.stdout.on('data', (b) => {
  log = (log + b).slice(-12000);
});
server.stderr.on('data', (b) => {
  log = (log + b).slice(-12000);
});
async function run(file, extra = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [file], {
      env: { ...process.env, BASE_URL: base, ...extra },
      stdio: 'inherit',
    });
    child.on('error', reject);
    child.on('exit', (code) =>
      code === 0 ? resolve() : reject(new Error(`${file} failed (${code})`)),
    );
  });
}
try {
  let ready = false;
  for (let attempt = 0; attempt < 120; attempt++) {
    if (server.exitCode !== null)
      throw new Error('Backend exited before startup');
    try {
      if ((await fetch(base + '/api/session')).ok) {
        ready = true;
        break;
      }
    } catch {}
    await setTimeout(250);
  }
  if (!ready) throw new Error('Backend did not become ready');
  await run('scripts/mcp-smoke.mjs');
  await run('scripts/multi-user-proof.mjs');
  await run('scripts/auth-proof.mjs');
} catch (error) {
  console.error(log);
  throw error;
} finally {
  server.kill('SIGTERM');
}
