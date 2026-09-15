'use client';
import { useEffect, useRef, useState } from 'react';
import {
  Sprout,
  ArrowRight,
  ShieldCheck,
  LoaderCircle,
  RefreshCw,
} from 'lucide-react';
import { api, ApiRequestError, type InvitationPreview } from '@/lib/api-client';

async function previewInvitation(token: string) {
  if (!token)
    throw new ApiRequestError(
      'Open the complete invitation link from your coordinator.',
      400,
    );
  const result = await api('/api/join', 'POST', { token, preview: true });
  if (!('name' in result))
    throw new Error('Unable to check this invitation. Please try again.');
  return result;
}
export default function Join() {
  const [token, setToken] = useState('');
  const [invite, setInvite] = useState<InvitationPreview | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);
  const [expired, setExpired] = useState(false);
  const invitationToken = useRef<string | null>(null);
  useEffect(() => {
    const value = invitationToken.current ?? window.location.hash.slice(1);
    invitationToken.current = value;
    history.replaceState(null, '', '/join');
    let active = true;
    async function inspectInvitation() {
      const result = await previewInvitation(value);
      if (active) {
        setToken(value);
        setInvite(result);
      }
    }
    void inspectInvitation()
      .catch((cause: unknown) => {
        if (active) {
          setError(
            cause instanceof Error
              ? cause.message
              : 'Unable to check this invitation. Please try the link again.',
          );
          setExpired(
            cause instanceof ApiRequestError &&
              [400, 404, 410].includes(cause.status),
          );
        }
      })
      .finally(() => {
        if (active) setChecking(false);
      });
    return () => {
      active = false;
    };
  }, []);
  async function join() {
    if (busy || expired || !invite) return;
    setBusy(true);
    setError('');
    try {
      await api('/api/join', 'POST', { token });
      window.location.assign('/');
    } catch (e) {
      setError((e as Error).message);
      setExpired(
        e instanceof ApiRequestError && [400, 404, 410].includes(e.status),
      );
      setBusy(false);
    }
  }
  async function retry() {
    if (checking || busy) return;
    setChecking(true);
    setError('');
    try {
      const value = invitationToken.current ?? '';
      setInvite(await previewInvitation(value));
      setToken(value);
      setExpired(false);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Unable to check this invitation. Please try again.',
      );
      setExpired(
        error instanceof ApiRequestError &&
          [400, 404, 410].includes(error.status),
      );
    } finally {
      setChecking(false);
    }
  }
  return (
    <main className="join-page">
      <div className="join-card">
        <span className="brand-icon">
          {checking ? <LoaderCircle className="loading-spin" /> : <Sprout />}
        </span>
        <p className="eyebrow">KINDHANDOFF</p>
        <h1>
          {invite ? `Welcome, ${invite.name}.` : 'A place in the circle.'}
        </h1>
        <p>
          {invite
            ? `You’ve been invited to help carry ${invite.recipient}’s day. You’ll see the shared plan, accept your own handoffs, and leave a note for the next person.`
            : checking
              ? 'Checking your personal invitation…'
              : expired
                ? 'Ask your coordinator for a fresh private invitation so you can join the right circle.'
                : 'We could not check this invitation yet. Your place in the circle has not changed.'}
        </p>
        {error && (
          <p role="alert" className="error-banner">
            {error}
          </p>
        )}
        {error && !expired && (
          <button
            className="button secondary"
            disabled={checking || busy}
            onClick={retry}
          >
            <RefreshCw size={17} />
            {checking ? 'Checking…' : 'Check invitation again'}
          </button>
        )}
        {invite && !expired && !checking && (
          <>
            <p className="privacy-note">
              <ShieldCheck size={18} />
              This private link signs you in as {invite.name}. Only continue if
              it was intended for you.
              {invite.demo ? ' This is an isolated demo circle.' : ''}
            </p>
            <button disabled={busy} className="button" onClick={join}>
              {busy ? 'Joining your circle…' : `Join as ${invite.name}`}
              {busy ? (
                <LoaderCircle size={18} className="loading-spin" />
              ) : (
                <ArrowRight size={18} />
              )}
            </button>
          </>
        )}
        <a href="/" className="text-link">
          Back to KindHandoff
        </a>
      </div>
    </main>
  );
}
