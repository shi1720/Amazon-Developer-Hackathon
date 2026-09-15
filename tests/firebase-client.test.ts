import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const sdk = vi.hoisted(() => {
  const auth = { useDeviceLanguage: vi.fn(), emulatorConfig: null };
  const user = { getIdToken: vi.fn() };
  return {
    auth,
    user,
    getApps: vi.fn(),
    initializeApp: vi.fn(),
    initializeAuth: vi.fn(),
    getAuth: vi.fn(),
    setPersistence: vi.fn(),
    connectAuthEmulator: vi.fn(),
    createUserWithEmailAndPassword: vi.fn(),
    signInWithEmailAndPassword: vi.fn(),
    signInWithPopup: vi.fn(),
    signOut: vi.fn(),
    sendPasswordResetEmail: vi.fn(),
    inMemoryPersistence: { type: 'NONE' },
  };
});
vi.mock('firebase/app', () => ({
  getApps: sdk.getApps,
  initializeApp: sdk.initializeApp,
}));
vi.mock('firebase/auth', () => ({
  browserPopupRedirectResolver: {},
  connectAuthEmulator: sdk.connectAuthEmulator,
  createUserWithEmailAndPassword: sdk.createUserWithEmailAndPassword,
  getAuth: sdk.getAuth,
  GoogleAuthProvider: class {
    setCustomParameters() {}
  },
  initializeAuth: sdk.initializeAuth,
  inMemoryPersistence: sdk.inMemoryPersistence,
  sendPasswordResetEmail: sdk.sendPasswordResetEmail,
  setPersistence: sdk.setPersistence,
  signInWithEmailAndPassword: sdk.signInWithEmailAndPassword,
  signInWithPopup: sdk.signInWithPopup,
  signOut: sdk.signOut,
}));

const configuration = {
  apiKey: 'public-test-key',
  authDomain: 'example.firebaseapp.com',
  projectId: 'example',
  appId: 'test-app',
};
const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.stubEnv('VITE_FIREBASE_CONFIG', JSON.stringify(configuration));
  vi.stubEnv('VITE_FIREBASE_GOOGLE_ENABLED', 'false');
  vi.stubEnv('VITE_FIREBASE_AUTH_EMULATOR', '');
  vi.stubGlobal('fetch', fetchMock);
  vi.stubGlobal('window', { location: { hostname: 'localhost' } });
  sdk.getApps.mockReturnValue([]);
  sdk.initializeApp.mockReturnValue({ name: 'kindhandoff-auth' });
  sdk.initializeAuth.mockReturnValue(sdk.auth);
  sdk.getAuth.mockReturnValue(sdk.auth);
  sdk.setPersistence.mockResolvedValue(undefined);
  sdk.user.getIdToken.mockResolvedValue('fixture-id-token');
  sdk.createUserWithEmailAndPassword.mockResolvedValue({ user: sdk.user });
  sdk.signInWithEmailAndPassword.mockResolvedValue({ user: sdk.user });
  sdk.signOut.mockResolvedValue(undefined);
  sdk.sendPasswordResetEmail.mockResolvedValue(undefined);
  fetchMock.mockResolvedValue(Response.json({ ok: true }));
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('Firebase browser session bootstrap', () => {
  it('initializes only in-memory state and takes no account action on page preparation', async () => {
    const client = await import('../lib/firebase-client');
    await Promise.all([client.firebaseAuth(), client.firebaseAuth()]);
    expect(sdk.initializeAuth).toHaveBeenCalledOnce();
    expect(sdk.initializeAuth).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ persistence: sdk.inMemoryPersistence }),
    );
    expect(sdk.setPersistence).toHaveBeenCalledWith(
      sdk.auth,
      sdk.inMemoryPersistence,
    );
    expect(sdk.createUserWithEmailAndPassword).not.toHaveBeenCalled();
    expect(sdk.signInWithEmailAndPassword).not.toHaveBeenCalled();
    expect(sdk.sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it('exchanges the fresh sign-in token without sending a password to the application server', async () => {
    const client = await import('../lib/firebase-client');
    await client.authenticateEmail(
      'signin',
      '  person@example.com  ',
      'local-fixture-password',
    );
    expect(sdk.signInWithEmailAndPassword).toHaveBeenCalledWith(
      sdk.auth,
      'person@example.com',
      'local-fixture-password',
    );
    expect(sdk.user.getIdToken).toHaveBeenCalledWith();
    expect(fetchMock).toHaveBeenCalledWith('/api/auth', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: 'fixture-id-token' }),
    });
    expect(sdk.signOut).toHaveBeenCalledWith(sdk.auth);
    expect(sdk.createUserWithEmailAndPassword).not.toHaveBeenCalled();
  });

  it('keeps signup explicit and does not silently sign in an existing account', async () => {
    sdk.createUserWithEmailAndPassword.mockRejectedValueOnce({
      code: 'auth/email-already-in-use',
    });
    const client = await import('../lib/firebase-client');
    await expect(
      client.authenticateEmail(
        'signup',
        'person@example.com',
        'local-fixture-password',
      ),
    ).rejects.toEqual({ code: 'auth/email-already-in-use' });
    expect(sdk.signInWithEmailAndPassword).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    {
      response: () => Response.json({ ok: false }),
      description: 'false success payload',
    },
    {
      response: () =>
        Response.json({ error: { message: 'rejected' } }, { status: 401 }),
      description: 'HTTP rejection',
    },
    {
      response: () => new Response('invalid JSON'),
      description: 'invalid JSON',
    },
  ])(
    'fails closed and clears Firebase state on $description',
    async ({ response }) => {
      fetchMock.mockResolvedValueOnce(response());
      const client = await import('../lib/firebase-client');
      await expect(
        client.authenticateEmail(
          'signin',
          'person@example.com',
          'local-fixture-password',
        ),
      ).rejects.toThrow('We could not open your circle');
      expect(sdk.signOut).toHaveBeenCalledWith(sdk.auth);
    },
  );

  it('explains that signup succeeded if only the subsequent session exchange fails', async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json({ ok: false }, { status: 503 }),
    );
    const client = await import('../lib/firebase-client');
    await expect(
      client.authenticateEmail(
        'signup',
        'person@example.com',
        'local-fixture-password',
      ),
    ).rejects.toThrow('Your account was created');
    expect(sdk.signOut).toHaveBeenCalledWith(sdk.auth);
  });

  it('sends reset mail only through its explicit action and does not disclose an unknown account', async () => {
    sdk.sendPasswordResetEmail.mockRejectedValueOnce({
      code: 'auth/user-not-found',
    });
    const client = await import('../lib/firebase-client');
    await client.firebaseAuth();
    expect(sdk.sendPasswordResetEmail).not.toHaveBeenCalled();
    await expect(
      client.requestPasswordReset(' person@example.com '),
    ).resolves.toBeUndefined();
    expect(sdk.sendPasswordResetEmail).toHaveBeenCalledWith(
      sdk.auth,
      'person@example.com',
    );
  });

  it('loads Hosting configuration when no local build configuration is provided', async () => {
    vi.stubEnv('VITE_FIREBASE_CONFIG', '');
    fetchMock.mockResolvedValueOnce(Response.json(configuration));
    const client = await import('../lib/firebase-client');
    await client.firebaseAuth();
    expect(fetchMock).toHaveBeenCalledWith(
      '/__/firebase/init.json',
      expect.objectContaining({ credentials: 'same-origin' }),
    );
    expect(sdk.initializeApp).toHaveBeenCalledWith(
      configuration,
      'kindhandoff-auth',
    );
  });

  it('rejects using the authentication emulator from a public hostname', async () => {
    vi.stubEnv('VITE_FIREBASE_AUTH_EMULATOR', 'http://127.0.0.1:9099');
    vi.stubGlobal('window', { location: { hostname: 'kindhandoff.web.app' } });
    const client = await import('../lib/firebase-client');
    await expect(client.firebaseAuth()).rejects.toThrow(
      'only available on localhost',
    );
    expect(sdk.connectAuthEmulator).not.toHaveBeenCalled();
  });
});
