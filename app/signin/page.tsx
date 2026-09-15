'use client';
import { useEffect, useRef, useState, type SubmitEvent } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  LoaderCircle,
  Mail,
  ShieldCheck,
  Sprout,
} from 'lucide-react';
import {
  authenticateEmail,
  authenticateGoogle,
  authEmulatorEnabled,
  authIssue,
  firebaseAuth,
  googleSignInEnabled,
  requestPasswordReset,
  type AuthIssue,
} from '@/lib/firebase-client';

type Mode = 'signin' | 'signup' | 'reset';
const text = (value: FormDataEntryValue | null) =>
  typeof value === 'string' ? value : '';

export default function SignIn() {
  const [mode, setMode] = useState<Mode>('signin');
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [issue, setIssue] = useState<AuthIssue | null>(null);
  const [notice, setNotice] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [initializationFailed, setInitializationFailed] = useState(false);
  const form = useRef<HTMLFormElement | null>(null);
  const errorSummary = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let active = true;
    void firebaseAuth()
      .then(() => {
        if (active) setReady(true);
      })
      .catch((error: unknown) => {
        if (active) {
          setIssue(authIssue(error));
          setInitializationFailed(true);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!issue) return;
    const control = issue.field
      ? form.current?.elements.namedItem(issue.field)
      : null;
    if (control instanceof HTMLInputElement) control.focus();
    else errorSummary.current?.focus();
  }, [issue]);

  function chooseMode(next: Mode) {
    if (busy) return;
    setMode(next);
    setIssue(null);
    setNotice('');
    setShowPassword(false);
    // Keep the email convenient while removing password values on mode changes.
    for (const name of ['password', 'confirmPassword']) {
      const control = form.current?.elements.namedItem(name);
      if (control instanceof HTMLInputElement) control.value = '';
    }
  }

  async function retryInitialization() {
    setBusy(true);
    setIssue(null);
    try {
      await firebaseAuth();
      setReady(true);
      setInitializationFailed(false);
    } catch (error) {
      setIssue(authIssue(error));
    } finally {
      setBusy(false);
    }
  }

  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !ready) return;
    const element = event.currentTarget;
    const values = new FormData(element);
    const email = text(values.get('email')).trim();
    const password = text(values.get('password'));
    setIssue(null);
    setNotice('');
    if (mode === 'signup' && password.length < 8) {
      setIssue({
        field: 'password',
        message: 'Use at least eight characters for your new password.',
      });
      return;
    }
    if (mode === 'signup' && password !== text(values.get('confirmPassword'))) {
      setIssue({
        field: 'confirmPassword',
        message: 'The passwords do not match. Enter your new password again.',
      });
      return;
    }
    setBusy(true);
    try {
      if (mode === 'reset') {
        await requestPasswordReset(email);
        setNotice(
          'If an account uses this email, you’ll receive a password-reset link. Check your inbox and spam folder.',
        );
      } else {
        await authenticateEmail(mode, email, password);
        element.reset();
        window.location.assign('/?setup=1');
      }
    } catch (error) {
      setIssue(authIssue(error, mode === 'reset'));
    } finally {
      setBusy(false);
    }
  }

  async function continueWithGoogle() {
    if (busy || !ready) return;
    setBusy(true);
    setIssue(null);
    setNotice('');
    try {
      await authenticateGoogle();
      form.current?.reset();
      window.location.assign('/?setup=1');
    } catch (error) {
      setIssue(authIssue(error));
    } finally {
      setBusy(false);
    }
  }

  const signup = mode === 'signup';
  const reset = mode === 'reset';
  const disabled = busy || !ready;
  const emailError = issue?.field === 'email';
  const passwordError = issue?.field === 'password';
  const confirmError = issue?.field === 'confirmPassword';
  return (
    <main className="join-page">
      <section className="join-card" aria-labelledby="signin-title">
        <span className="brand-icon" aria-hidden="true">
          <Sprout />
        </span>
        <p className="eyebrow">KINDHANDOFF · YOUR FAMILY’S PLAN B</p>
        <h1 id="signin-title">
          {reset
            ? 'A fresh start.'
            : signup
              ? 'Make room for your circle.'
              : 'A day held together.'}
        </h1>
        <p style={{ marginBottom: 24 }}>
          {reset
            ? 'Enter your account email. We’ll send a link so you can choose a new password.'
            : signup
              ? 'Create an account to coordinate practical support with the people you trust.'
              : 'Sign in to your family’s shared plan, accepted handoffs, and the little details that matter.'}
        </p>
        {!reset && (
          <fieldset
            style={{
              border: 0,
              padding: 4,
              margin: '0 0 24px',
              display: 'flex',
              gap: 4,
              background: '#edf2f8',
              borderRadius: 12,
            }}
          >
            <legend className="sr-only">Choose your account action</legend>
            <button
              type="button"
              className={`button small ${signup ? 'secondary' : ''}`}
              aria-pressed={!signup}
              disabled={busy}
              style={{ flex: 1 }}
              onClick={() => chooseMode('signin')}
            >
              I have an account
            </button>
            <button
              type="button"
              className={`button small ${signup ? '' : 'secondary'}`}
              aria-pressed={signup}
              disabled={busy}
              style={{ flex: 1 }}
              onClick={() => chooseMode('signup')}
            >
              I’m new here
            </button>
          </fieldset>
        )}
        {authEmulatorEnabled && (
          <p className="form-hint" style={{ margin: '0 0 16px' }}>
            Local test sign-in · Firebase Authentication emulator
          </p>
        )}
        {issue && (
          <div
            ref={errorSummary}
            tabIndex={-1}
            id="auth-error"
            role="alert"
            className="error-banner"
            style={{ marginBottom: 18 }}
          >
            {issue.message}
          </div>
        )}
        {notice && (
          <output
            style={{
              display: 'flex',
              gap: 10,
              padding: 14,
              borderRadius: 10,
              background: '#edf7f1',
              color: '#296349',
              marginBottom: 18,
              fontSize: 14,
            }}
          >
            <Check size={18} aria-hidden="true" style={{ flexShrink: 0 }} />
            <span>{notice}</span>
          </output>
        )}
        {initializationFailed && (
          <button
            type="button"
            className="button secondary small"
            disabled={busy}
            onClick={retryInitialization}
            style={{ margin: '0 0 20px' }}
          >
            Try connecting again
          </button>
        )}
        <form
          ref={form}
          className="app-form"
          onSubmit={submit}
          aria-busy={busy}
        >
          <label htmlFor="auth-email">
            Email address
            <input
              id="auth-email"
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              required
              maxLength={254}
              disabled={busy}
              spellCheck={false}
              autoCapitalize="none"
              placeholder="you@example.com"
              aria-invalid={emailError}
              aria-describedby={emailError ? 'auth-error' : undefined}
            />
          </label>
          {!reset && (
            <>
              <label htmlFor="auth-password">
                {signup ? 'Choose a password' : 'Password'}
                <input
                  id="auth-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={signup ? 'new-password' : 'current-password'}
                  required
                  minLength={signup ? 8 : undefined}
                  maxLength={4096}
                  disabled={busy}
                  aria-invalid={passwordError}
                  aria-describedby={
                    [
                      passwordError ? 'auth-error' : '',
                      signup ? 'password-hint' : '',
                    ]
                      .filter(Boolean)
                      .join(' ') || undefined
                  }
                />
              </label>
              {signup && (
                <p id="password-hint" className="form-hint">
                  Use at least eight characters. A longer, unique password is
                  best.
                </p>
              )}
              {signup && (
                <label htmlFor="auth-confirm-password">
                  Confirm your password
                  <input
                    id="auth-confirm-password"
                    name="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    maxLength={4096}
                    disabled={busy}
                    aria-invalid={confirmError}
                    aria-describedby={confirmError ? 'auth-error' : undefined}
                  />
                </label>
              )}
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 12,
                  marginTop: -4,
                }}
              >
                <button
                  type="button"
                  className="text-button"
                  disabled={busy}
                  aria-pressed={showPassword}
                  aria-controls={
                    signup
                      ? 'auth-password auth-confirm-password'
                      : 'auth-password'
                  }
                  onClick={() => setShowPassword((value) => !value)}
                >
                  {showPassword ? (
                    <EyeOff size={16} aria-hidden="true" />
                  ) : (
                    <Eye size={16} aria-hidden="true" />
                  )}
                  {showPassword ? 'Hide password' : 'Show password'}
                </button>
                {!signup && (
                  <button
                    type="button"
                    className="text-button"
                    disabled={busy}
                    onClick={() => chooseMode('reset')}
                  >
                    Forgot your password?
                  </button>
                )}
              </div>
            </>
          )}
          <button
            className="button"
            type="submit"
            disabled={disabled}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            {busy ? (
              <>
                <LoaderCircle
                  size={18}
                  aria-hidden="true"
                  className="loading-spin"
                />
                {reset ? 'Sending reset email…' : 'Opening your circle…'}
              </>
            ) : !ready ? (
              <>
                {!initializationFailed && (
                  <LoaderCircle
                    size={18}
                    aria-hidden="true"
                    className="loading-spin"
                  />
                )}
                {initializationFailed
                  ? 'Sign-in unavailable'
                  : 'Connecting securely…'}
              </>
            ) : reset ? (
              <>
                Send reset email <Mail size={18} aria-hidden="true" />
              </>
            ) : (
              <>
                {signup ? 'Create my account' : 'Sign in'}
                <ArrowRight size={18} aria-hidden="true" />
              </>
            )}
          </button>
        </form>
        {googleSignInEnabled && !reset && (
          <>
            <p style={{ textAlign: 'center', margin: '18px 0', fontSize: 13 }}>
              or
            </p>
            <button
              type="button"
              className="button secondary"
              style={{ width: '100%', justifyContent: 'center', margin: 0 }}
              disabled={disabled}
              onClick={continueWithGoogle}
            >
              Continue with Google <ArrowUpRightIcon />
            </button>
          </>
        )}
        {reset ? (
          <button
            type="button"
            className="text-button"
            style={{ marginTop: 22 }}
            disabled={busy}
            onClick={() => chooseMode('signin')}
          >
            <ArrowLeft size={16} aria-hidden="true" />
            Back to sign in
          </button>
        ) : (
          <p
            className="privacy-note"
            style={{ marginTop: 24, fontSize: 12, lineHeight: 1.7 }}
          >
            <ShieldCheck size={18} aria-hidden="true" />
            <span>
              You choose who joins your circle. Helpers use a private invitation
              to accept their own handoffs.
            </span>
          </p>
        )}
        <a
          href="/"
          className="text-link"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}
        >
          <ArrowLeft size={15} aria-hidden="true" />
          Back to KindHandoff
        </a>
      </section>
    </main>
  );
}

function ArrowUpRightIcon() {
  return (
    <ArrowRight
      size={17}
      aria-hidden="true"
      style={{ transform: 'rotate(-45deg)' }}
    />
  );
}
