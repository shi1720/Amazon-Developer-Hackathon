import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  parseArguments,
  releaseEnvironment,
  validateDeployment,
} from '../scripts/deploy-firebase.mjs';

const configuration = () =>
  JSON.parse(
    readFileSync(new URL('../firebase.json', import.meta.url), 'utf8'),
  );

describe('Firebase release preflight', () => {
  it('excludes unrelated shell credentials from build and emulator subprocesses', () => {
    expect(
      releaseEnvironment({
        PATH: '/safe/bin',
        HOME: '/safe/profile',
        JAVA_HOME: '/safe/java',
        UNRELATED_PRIVATE_KEY: 'never-log-this-test-value',
        FIREBASE_TOKEN: 'test-credential-must-not-enter-debug-logs',
      }),
    ).toEqual({
      PATH: '/safe/bin',
      HOME: '/safe/profile',
      JAVA_HOME: '/safe/java',
    });
  });
  it('requires an explicit production project and rejects unknown options', () => {
    expect(
      parseArguments(['--project', 'kindhandoff', '--check-only']),
    ).toMatchObject({ project: 'kindhandoff', checkOnly: true });
    expect(() => parseArguments(['--skip-tests'])).toThrow('Use --project');
    expect(() => validateDeployment(configuration(), '', {})).toThrow(
      'Explicitly select',
    );
    expect(() =>
      validateDeployment(configuration(), 'another-project', {}),
    ).toThrow('Explicitly select');
  });

  it('accepts the reviewed single pinned rewrite and matching runtime origin', () => {
    expect(() =>
      validateDeployment(configuration(), 'kindhandoff', {
        PUBLIC_ORIGIN: 'https://kindhandoff.web.app',
      }),
    ).not.toThrow();
  });

  it('rejects an unpinned function or duplicated routing rule before deployment', () => {
    const unpinned = configuration();
    unpinned.hosting.rewrites[0].function.pinTag = false;
    expect(() => validateDeployment(unpinned, 'kindhandoff', {})).toThrow(
      'one pinned',
    );
    const duplicate = configuration();
    duplicate.hosting.rewrites.unshift({ ...duplicate.hosting.rewrites[0] });
    expect(() => validateDeployment(duplicate, 'kindhandoff', {})).toThrow(
      'one pinned',
    );
  });

  it('rejects emulator and build overrides without echoing their values', () => {
    for (const name of [
      'FIRESTORE_EMULATOR_HOST',
      'FIREBASE_AUTH_EMULATOR_HOST',
      'VITE_FIREBASE_CONFIG',
      'VITE_FIREBASE_AUTH_EMULATOR',
    ]) {
      try {
        validateDeployment(configuration(), 'kindhandoff', {
          [name]: 'private-test-value',
        });
        expect.fail('Unsafe configuration was accepted');
      } catch (error) {
        expect(String(error)).toContain(name);
        expect(String(error)).not.toContain('private-test-value');
      }
    }
  });

  it('rejects production dotenv files using names only and never reading contents', () => {
    expect(() =>
      validateDeployment(configuration(), 'kindhandoff', {}, [
        'functions/.env.kindhandoff',
      ]),
    ).toThrow('File contents were not read');
    expect(() =>
      validateDeployment(configuration(), 'kindhandoff', {
        GCLOUD_PROJECT: 'demo-kindhandoff',
      }),
    ).toThrow('mismatched');
  });
});
