'use client';
import { useEffect, useRef, useState } from 'react';
import { Sprout, ArrowRight, ShieldCheck } from 'lucide-react';
import { api, type InvitationPreview } from '@/lib/api-client';
export default function Join() {
  const [token, setToken] = useState('');
  const [invite, setInvite] = useState<InvitationPreview | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const invitationToken = useRef<string | null>(null);
  useEffect(() => {
    const value = invitationToken.current ?? window.location.hash.slice(1);
    invitationToken.current = value;
    history.replaceState(null, '', '/join');
    let active = true;
    async function inspectInvitation() {
      if (!value)
        throw new Error(
          'Open the complete invitation link from your coordinator.',
        );
      const result = await api('/api/join', 'POST', {
        token: value,
        preview: true,
      });
      if (!('name' in result))
        throw new Error(
          'Unable to check this invitation. Please try the link again.',
        );
      if (active) {
        setToken(value);
        setInvite(result);
      }
    }
    void inspectInvitation().catch((cause: unknown) => {
      if (active)
        setError(
          cause instanceof Error
            ? cause.message
            : 'Unable to check this invitation. Please try the link again.',
        );
    });
    return () => {
      active = false;
    };
  }, []);
  async function join() {
    setBusy(true);
    try {
      await api('/api/join', 'POST', { token });
      window.location.assign('/');
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <main className="join-page">
      <div className="join-card">
        <span className="brand-icon">
          <Sprout />
        </span>
        <p className="eyebrow">KINDHANDOFF</p>
        <h1>
          {invite ? `Welcome, ${invite.name}.` : 'A place in the circle.'}
        </h1>
        <p>
          {invite
            ? `You’ve been invited to help carry ${invite.recipient}’s day. You’ll see the shared plan, accept your own handoffs, and leave a note for the next person.`
            : 'Checking your personal invitation…'}
        </p>
        {error && (
          <p role="alert" className="error-banner">
            {error}
          </p>
        )}
        {invite && !error && (
          <>
            <p className="privacy-note">
              <ShieldCheck size={18} />
              This private link signs you in as {invite.name}. Only continue if
              it was intended for you.
              {invite.demo ? ' This is an isolated demo circle.' : ''}
            </p>
            <button disabled={busy} className="button" onClick={join}>
              Join as {invite.name}
              <ArrowRight size={18} />
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
