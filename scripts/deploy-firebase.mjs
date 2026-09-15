#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CLI = 'firebase-tools@15.30.1';
const productionProject = 'kindhandoff';
const emulatorProject = 'demo-kindhandoff-release-tests';
const productionEnvFiles = [
  '.env',
  '.env.local',
  '.env.production',
  '.env.production.local',
  'functions/.env',
  'functions/.env.local',
  `functions/.env.${productionProject}`,
];

// Firebase CLI's emulator runner includes its inherited environment in a debug
// log. Pass an allowlist so unrelated model keys or other shell secrets cannot
// enter build/test subprocesses or that log. CLI login is read from its normal
// local profile; this release command does not accept token environment vars.
export function releaseEnvironment(environment) {
  const safe = {};
  for (const name of [
    'PATH',
    'HOME',
    'USERPROFILE',
    'SystemRoot',
    'SYSTEMROOT',
    'COMSPEC',
    'TMPDIR',
    'TMP',
    'TEMP',
    'JAVA_HOME',
    'LANG',
    'LC_ALL',
    'LC_CTYPE',
    'TERM',
    'COLORTERM',
    'NO_COLOR',
    'FORCE_COLOR',
    'CI',
    'VITE_FIREBASE_GOOGLE_ENABLED',
  ])
    if (environment[name] !== undefined) safe[name] = environment[name];
  return safe;
}

export function parseArguments(args) {
  const options = { project: '', checkOnly: false, plan: false, help: false };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--project' && args[i + 1] && !args[i + 1].startsWith('--'))
      options.project = args[++i];
    else if (arg === '--check-only') options.checkOnly = true;
    else if (arg === '--plan') options.plan = true;
    else if (arg === '--help') options.help = true;
    else
      throw new Error(
        'Use --project kindhandoff, --check-only, --plan, or --help.',
      );
  }
  return options;
}

/** Fail before builds or network calls if a release could use the wrong target. */
export function validateDeployment(
  config,
  project,
  environment,
  envFiles = [],
) {
  if (project !== productionProject || config.hosting?.site !== project)
    throw new Error(
      'Explicitly select --project kindhandoff. Forks need their own reviewed deployment configuration.',
    );
  const rewrites = config.hosting?.rewrites;
  if (
    !Array.isArray(rewrites) ||
    rewrites.length !== 2 ||
    rewrites[0]?.regex !== '^/(api/.*|mcp)$' ||
    rewrites[0]?.function?.functionId !== 'api' ||
    rewrites[0]?.function?.region !== 'us-central1' ||
    rewrites[0]?.function?.pinTag !== true ||
    rewrites[1]?.source !== '**' ||
    rewrites[1]?.destination !== '/index.html' ||
    config.hosting.public !== 'dist/client'
  )
    throw new Error(
      'Keep one pinned API/MCP regex rewrite, followed by the static application fallback.',
    );
  if (
    config.functions?.length !== 1 ||
    config.functions[0]?.source !== 'functions' ||
    config.functions[0]?.codebase !== 'kindhandoff' ||
    config.firestore?.rules !== 'firestore.rules'
  )
    throw new Error(
      'The function codebase or Firestore rules configuration changed. Review the deployment target.',
    );
  for (const name of [
    'FIRESTORE_EMULATOR_HOST',
    'FIREBASE_AUTH_EMULATOR_HOST',
    'FIREBASE_DATABASE_EMULATOR_HOST',
    'FIREBASE_STORAGE_EMULATOR_HOST',
    'VITE_FIREBASE_AUTH_EMULATOR',
    'VITE_FIREBASE_CONFIG',
  ])
    if (environment[name])
      throw new Error(`Unset ${name} before preparing a production release.`);
  for (const name of ['GCLOUD_PROJECT', 'GOOGLE_CLOUD_PROJECT'])
    if (environment[name] && environment[name] !== project)
      throw new Error(
        `Unset the mismatched ${name} before preparing a production release.`,
      );
  if (
    environment.PUBLIC_ORIGIN &&
    environment.PUBLIC_ORIGIN !== `https://${project}.web.app`
  )
    throw new Error(
      'Unset the nonproduction PUBLIC_ORIGIN before preparing a release.',
    );
  if (envFiles.length)
    throw new Error(
      'Production dotenv overrides are present. Move them out before release; this app uses Hosting public configuration and runtime identity. File contents were not read.',
    );
}

function run(command, args, env = releaseEnvironment(process.env)) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(command, args, { cwd: root, env, stdio: 'inherit' });
    const interrupt = () => child.kill('SIGTERM');
    process.once('SIGINT', interrupt);
    process.once('SIGTERM', interrupt);
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      process.removeListener('SIGINT', interrupt);
      process.removeListener('SIGTERM', interrupt);
      if (code === 0) resolveRun();
      else
        reject(
          new Error(
            `${command} failed (${signal ?? code ?? 'startup error'}). Deployment stopped.`,
          ),
        );
    });
  });
}

async function availablePort() {
  const server = createServer();
  return new Promise((resolvePort, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      server.close((error) => (error ? reject(error) : resolvePort(port)));
    });
  });
}

async function verifyWithEmulators(config) {
  const temp = await mkdtemp(join(tmpdir(), 'kindhandoff-release-'));
  try {
    const ports = [];
    while (ports.length < 5) {
      const port = await availablePort();
      if (!ports.includes(port)) ports.push(port);
    }
    const emulatorConfig = {
      firestore: { rules: join(root, config.firestore.rules) },
      emulators: {
        auth: { host: '127.0.0.1', port: ports[0] },
        firestore: {
          host: '127.0.0.1',
          port: ports[1],
          websocketPort: ports[2],
        },
        hub: { host: '127.0.0.1', port: ports[3] },
        logging: { host: '127.0.0.1', port: ports[4] },
        ui: { enabled: false },
        singleProjectMode: true,
      },
    };
    const configPath = join(temp, 'firebase.json');
    await writeFile(configPath, JSON.stringify(emulatorConfig));
    // The child runner sets only demo project IDs and loopback emulator hosts.
    // No production account or circle is created by this verification stage.
    await run(
      process.platform === 'win32' ? 'npx.cmd' : 'npx',
      [
        '--yes',
        CLI,
        'emulators:exec',
        '--only',
        'auth,firestore',
        '--project',
        emulatorProject,
        '--config',
        configPath,
        'npm run test:firestore && node scripts/verify-local.mjs',
      ],
      {
        ...releaseEnvironment(process.env),
        GCLOUD_PROJECT: emulatorProject,
        GOOGLE_CLOUD_PROJECT: emulatorProject,
      },
    );
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
}

async function publicSmoke(project) {
  const base = `https://${project}.web.app`;
  const get = (path) =>
    fetch(base + path, {
      signal: AbortSignal.timeout(40_000),
      cache: 'no-store',
    });
  const home = await get('/');
  if (!home.ok || !home.headers.get('content-type')?.includes('text/html'))
    throw new Error(
      'Deployment completed, but the public page did not pass its smoke check.',
    );
  const session = await get('/api/session');
  if (
    !session.ok ||
    !session.headers.get('content-type')?.includes('application/json')
  )
    throw new Error(
      'Deployment completed, but the API rewrite did not return JSON.',
    );
  const state = await session.json();
  if (state.circle !== null || state.signedIn !== false)
    throw new Error(
      'Deployment completed, but the anonymous session check failed.',
    );
  const mcp = await get('/mcp');
  if (mcp.status !== 405 || !mcp.headers.get('allow')?.includes('POST'))
    throw new Error('Deployment completed, but the MCP route check failed.');
  const settings = await get('/__/firebase/init.json');
  if (!settings.ok || (await settings.json()).projectId !== project)
    throw new Error(
      'Deployment completed, but public Firebase configuration does not match.',
    );
  console.log(`Public read-only smoke checks passed: ${base}`);
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    console.log(
      'Usage: npm run deploy:firebase -- --project kindhandoff [--check-only | --plan]\n--plan validates configuration and prints steps without installing, testing, or deploying.\n--check-only installs locked dependencies and runs all local checks without deployment.\nRequires Node 22.13+, Java 21+, and Firebase CLI authentication for deployment.',
    );
    return;
  }
  const [major, minor] = process.versions.node.split('.').map(Number);
  if (major < 22 || (major === 22 && minor < 13))
    throw new Error('Use Node 22.13 or later.');
  const config = JSON.parse(
    await readFile(join(root, 'firebase.json'), 'utf8'),
  );
  validateDeployment(
    config,
    options.project,
    process.env,
    productionEnvFiles.filter((file) => existsSync(join(root, file))),
  );
  const steps = [
    'Install root and Functions dependencies from lockfiles.',
    'Run lint, TypeScript, unit tests and a production build.',
    'Run Firestore regression tests and compiled API/Auth/MCP proofs in temporary local emulators.',
    ...(options.checkOnly
      ? []
      : [
          'Deploy Firestore rules, the API function and Hosting together with the pinned rewrite.',
          'Check public page, session, MCP routing and Firebase configuration without creating data.',
        ]),
  ];
  console.log(
    `Firebase release target: ${options.project}\n${steps.map((step, i) => `${i + 1}. ${step}`).join('\n')}`,
  );
  if (options.plan) return;
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  await run(npm, ['ci']);
  await run(npm, ['ci', '--prefix', 'functions']);
  await run(npm, ['run', 'check']);
  await verifyWithEmulators(config);
  if (options.checkOnly) {
    console.log('Release verification passed. Nothing was deployed.');
    return;
  }
  // Never split or duplicate the API/MCP rewrite. pinTag couples the frontend
  // release to its API revision: https://firebase.google.com/docs/hosting/functions
  await run(process.platform === 'win32' ? 'npx.cmd' : 'npx', [
    '--yes',
    CLI,
    'deploy',
    '--only',
    'firestore,functions,hosting',
    '--project',
    options.project,
    '--non-interactive',
  ]);
  await publicSmoke(options.project);
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  main().catch((error) => {
    console.error(
      error instanceof Error ? error.message : 'Firebase release failed.',
    );
    process.exitCode = 1;
  });
