/// <reference types="vite/client" />
import { getApps, initializeApp, type FirebaseOptions } from 'firebase/app';
import {
  browserPopupRedirectResolver,
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
  initializeAuth,
  inMemoryPersistence,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type Auth,
  type User,
} from 'firebase/auth';
import { isRecord, responseError } from './api-client';

type BuildEnvironment = {
  VITE_FIREBASE_CONFIG?: string;
  VITE_FIREBASE_GOOGLE_ENABLED?: string;
  VITE_FIREBASE_AUTH_EMULATOR?: string;
};
const buildEnvironment = import.meta.env as BuildEnvironment;
export const googleSignInEnabled =
  buildEnvironment?.VITE_FIREBASE_GOOGLE_ENABLED === 'true';
export const authEmulatorEnabled = Boolean(
  buildEnvironment?.VITE_FIREBASE_AUTH_EMULATOR,
);
export type AccountMode = 'signin' | 'signup';
export type AuthIssue = {
  message: string;
  field?: 'email' | 'password' | 'confirmPassword';
};

class SessionExchangeError extends Error {
  constructor(public accountCreated: boolean) {
    super(
      accountCreated
        ? 'Your account was created, but we could not open your circle. Choose “I have an account” and sign in again.'
        : 'We could not open your circle. Please sign in again.',
    );
    this.name = 'SessionExchangeError';
  }
}

/** Never surface Firebase's raw error message, which may include user input. */
export function authIssue(error: unknown, reset = false): AuthIssue {
  if (error instanceof SessionExchangeError) return { message: error.message };
  const code =
    isRecord(error) && typeof error.code === 'string' ? error.code : '';
  switch (code) {
    case 'auth/invalid-email':
      return {
        field: 'email',
        message: 'Enter a valid email address, such as name@example.com.',
      };
    case 'auth/email-already-in-use':
      return {
        field: 'email',
        message:
          'An account already uses this email. Choose “I have an account” to sign in or reset your password.',
      };
    case 'auth/missing-password':
      return { field: 'password', message: 'Enter your password.' };
    case 'auth/weak-password':
    case 'auth/password-does-not-meet-requirements':
      return {
        field: 'password',
        message:
          'Choose a stronger password with at least eight characters, including uppercase and lowercase letters, a number, and a symbol.',
      };
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return {
        field: 'password',
        message:
          'The email and password did not match. Check both, or use “Forgot your password?”.',
      };
    case 'auth/user-disabled':
      return {
        message:
          'This account is unavailable. Contact the person who manages your account.',
      };
    case 'auth/too-many-requests':
      return {
        message:
          'There have been too many attempts. Wait a few minutes, then try again.',
      };
    case 'auth/network-request-failed':
      return { message: 'Check your internet connection and try again.' };
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return {
        message:
          'Google sign-in was cancelled. You can try again or use your email.',
      };
    case 'auth/popup-blocked':
      return {
        message:
          'Your browser blocked the sign-in window. Allow popups for this site, or use your email.',
      };
    case 'auth/account-exists-with-different-credential':
      return {
        field: 'email',
        message:
          'This email uses another sign-in method. Sign in with the method you used when you created the account.',
      };
    case 'auth/operation-not-allowed':
    case 'auth/unauthorized-domain':
    case 'auth/configuration-not-found':
    case 'auth/invalid-api-key':
      return {
        message:
          'This sign-in method is not available right now. Please try again later.',
      };
    default:
      return {
        message: reset
          ? 'We could not send a reset email. Please check your connection and try again.'
          : 'Sign-in is unavailable right now. Please try again in a moment.',
      };
  }
}

function firebaseConfiguration(value: unknown): FirebaseOptions {
  if (!isRecord(value))
    throw new Error('Firebase configuration is unavailable.');
  const configuration: FirebaseOptions = {};
  for (const key of ['apiKey', 'authDomain', 'projectId', 'appId'] as const) {
    if (typeof value[key] !== 'string' || !value[key].trim()) {
      throw new Error('Firebase configuration is incomplete.');
    }
    configuration[key] = value[key];
  }
  return configuration;
}

let authPromise: Promise<Auth> | null = null;
export function firebaseAuth(): Promise<Auth> {
  if (!authPromise) {
    authPromise = initializeClientAuth().catch((error: unknown) => {
      // A transient Hosting/configuration failure can be retried by the user.
      authPromise = null;
      throw error;
    });
  }
  return authPromise;
}

async function initializeClientAuth(): Promise<Auth> {
  const configured = buildEnvironment?.VITE_FIREBASE_CONFIG;
  let value: unknown;
  if (configured) value = JSON.parse(configured) as unknown;
  else {
    const response = await fetch('/__/firebase/init.json', {
      cache: 'no-store',
      credentials: 'same-origin',
    });
    if (!response.ok)
      throw new Error('Firebase Hosting configuration is unavailable.');
    value = await response.json();
  }
  const configuration = firebaseConfiguration(value);
  const existing = getApps().find((app) => app.name === 'kindhandoff-auth');
  const app = existing ?? initializeApp(configuration, 'kindhandoff-auth');
  const auth = existing
    ? getAuth(app)
    : initializeAuth(app, {
        persistence: inMemoryPersistence,
        ...(googleSignInEnabled
          ? { popupRedirectResolver: browserPopupRedirectResolver }
          : {}),
      });
  const emulatorUrl = buildEnvironment?.VITE_FIREBASE_AUTH_EMULATOR;
  if (emulatorUrl) {
    const loopback = new Set(['localhost', '127.0.0.1', '[::1]']);
    const emulator = new URL(emulatorUrl);
    if (
      !loopback.has(window.location.hostname) ||
      !loopback.has(emulator.hostname)
    ) {
      throw new Error(
        'The authentication emulator is only available on localhost.',
      );
    }
    if (!auth.emulatorConfig)
      connectAuthEmulator(auth, emulatorUrl, { disableWarnings: true });
  }
  await setPersistence(auth, inMemoryPersistence);
  auth.useDeviceLanguage();
  return auth;
}

async function exchangeSession(
  auth: Auth,
  user: User,
  accountCreated: boolean,
): Promise<void> {
  try {
    // Sign-in just obtained a fresh token. Avoid an unnecessary refresh round trip;
    // the server independently verifies revocation and the recent auth_time.
    const idToken = await user.getIdToken();
    const response = await fetch('/api/auth', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });
    const value: unknown = await response.json();
    if (
      !response.ok ||
      !isRecord(value) ||
      value.ok !== true ||
      responseError(value)
    ) {
      throw new SessionExchangeError(accountCreated);
    }
  } catch {
    throw new SessionExchangeError(accountCreated);
  } finally {
    // Firebase only bootstraps the server's HttpOnly session. Remove its
    // in-memory token even if the server could not establish that session.
    await signOut(auth);
  }
}

export async function authenticateEmail(
  mode: AccountMode,
  email: string,
  password: string,
): Promise<void> {
  const auth = await firebaseAuth();
  const credential =
    mode === 'signup'
      ? await createUserWithEmailAndPassword(auth, email.trim(), password)
      : await signInWithEmailAndPassword(auth, email.trim(), password);
  await exchangeSession(auth, credential.user, mode === 'signup');
}

export async function authenticateGoogle(): Promise<void> {
  if (!googleSignInEnabled)
    throw new Error('Google sign-in is not configured.');
  const auth = await firebaseAuth();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const credential = await signInWithPopup(auth, provider);
  await exchangeSession(auth, credential.user, false);
}

/** Called only by the user's explicit “Send reset email” form submission. */
export async function requestPasswordReset(email: string): Promise<void> {
  const auth = await firebaseAuth();
  try {
    await sendPasswordResetEmail(auth, email.trim());
  } catch (error) {
    // Match Firebase email-enumeration protection when it is enabled, and
    // avoid disclosing account existence if an emulator/older project differs.
    if (isRecord(error) && error.code === 'auth/user-not-found') return;
    throw error;
  }
}
