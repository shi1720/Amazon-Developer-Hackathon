import { build } from 'esbuild';
await build({
  entryPoints: ['functions/index.ts', 'functions/local.ts'],
  outdir: 'functions/lib',
  outExtension: { '.js': '.mjs' },
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  packages: 'external',
  sourcemap: true,
  tsconfig: 'tsconfig.json',
});
