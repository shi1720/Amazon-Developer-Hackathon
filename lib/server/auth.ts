import { Timestamp } from 'firebase-admin/firestore';
import { DomainError, type Principal } from '../domain/types';
import { firebaseAuth } from './firebase';
import {
  DAY,
  database,
  circleRef,
  sessionRef,
  findOwnedCircle,
  requireCircleRecord,
  assertSessionForCircle,
  currentIdentity,
  registerPrincipal,
  type SessionRecord,
  type VerifiedIdentity,
} from './db';
import { newToken, hashToken, validToken } from './tokens';
export { newToken, hashToken } from './tokens';

// Firebase Hosting forwards this cookie to rewritten Cloud Functions.
export const COOKIE = '__session';
export function cookie(request: Request, value: string, maxAge = 86400) {
  return `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.max(0, Math.floor(maxAge))}${new URL(request.url).protocol === 'https:' ? '; Secure' : ''}`;
}
export function browserToken(request: Request) {
  const matches = (request.headers.get('cookie') ?? '')
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.startsWith(COOKIE + '='));
  return matches.length === 1 ? matches[0]!.slice(COOKIE.length + 1) : null;
}
export interface SessionContext {
  session: SessionRecord;
  hash: string;
  identity: VerifiedIdentity | null;
  principal: Principal | null;
}
export async function sessionContext(
  request: Request,
  allowMcpBearer = false,
): Promise<SessionContext | null> {
  const auth = request.headers.get('authorization');
  if (auth && !allowMcpBearer)
    throw new DomainError(
      'FORBIDDEN',
      'MCP bearer tokens are restricted to the MCP endpoint.',
      403,
    );
  if (auth && !/^Bearer [a-f0-9]{64}$/.test(auth))
    throw new DomainError(
      'UNAUTHORIZED',
      'Use a valid dedicated MCP bearer token.',
      401,
    );
  const bearer = auth ? auth.slice(7) : null;
  const raw = bearer ?? browserToken(request);
  const invalid = () => {
    if (bearer)
      throw new DomainError(
        'UNAUTHORIZED',
        'This MCP token expired or was revoked.',
        401,
      );
    return null;
  };
  if (!validToken(raw)) return invalid();
  const hash = await hashToken(raw);
  const snapshot = await sessionRef(hash).get();
  if (!snapshot.exists) return invalid();
  const session = snapshot.data() as SessionRecord;
  if (session.expiresAt.toMillis() <= Date.now()) return invalid();
  if (session.kind === 'mcp' && (!allowMcpBearer || !bearer))
    throw new DomainError(
      'FORBIDDEN',
      'MCP tokens require the MCP endpoint and Bearer authentication.',
      403,
    );
  if (bearer && session.kind !== 'mcp')
    throw new DomainError('UNAUTHORIZED', 'Use a dedicated MCP token.', 401);
  const identity = currentIdentity(session);
  let circleId = session.circleId;
  if (session.kind === 'owner') {
    if (!identity) return invalid();
    const owned = await findOwnedCircle(identity.uid);
    if (!owned) return { session, hash, identity, principal: null };
    circleId = owned.id;
  }
  if (!circleId) return invalid();
  const circleSnapshot = await circleRef(circleId).get();
  let circle;
  try {
    circle = assertSessionForCircle(
      session,
      hash,
      requireCircleRecord(circleSnapshot),
    );
  } catch (error) {
    if (error instanceof DomainError && [401, 404].includes(error.status))
      return invalid();
    throw error;
  }
  const p: Principal = {
    circleId,
    memberId: session.memberId,
    kind: session.kind,
    ...(identity ? { identity: identity.uid } : {}),
  };
  if (!circle.members.some((m) => m.id === p.memberId)) return invalid();
  return { session, hash, identity, principal: registerPrincipal(p, hash) };
}
export async function principal(
  request: Request,
  allowMcpBearer = false,
): Promise<Principal | null> {
  return (await sessionContext(request, allowMcpBearer))?.principal ?? null;
}
export async function requirePrincipal(
  request: Request,
  allowMcpBearer = false,
) {
  const p = await principal(request, allowMcpBearer);
  if (!p)
    throw new DomainError(
      'UNAUTHORIZED',
      'Sign in, open your invitation, or start an isolated demo first.',
      401,
    );
  if (p.kind === 'demo') {
    const actor = request.headers.get('x-dayweave-demo-member');
    if (actor) p.memberId = actor;
  }
  return p;
}
export function requireOwner(p: Principal, ownerId: string) {
  if (p.memberId !== ownerId)
    throw new DomainError(
      'FORBIDDEN',
      'Only the circle coordinator can do that.',
      403,
    );
}
export async function issueSession(
  circleId: string | null,
  memberId: string,
  kind: 'owner' | 'demo',
  hours = 24,
  identity: VerifiedIdentity | null = null,
  replaceHash: string | null = null,
  requireParentSession = false,
) {
  if (kind === 'owner' && !identity)
    throw new DomainError(
      'UNAUTHORIZED',
      'A verified Firebase identity is required.',
      401,
    );
  const token = newToken();
  const now = Date.now();
  let expires = now + hours * 3_600_000;
  if (kind === 'owner')
    expires = Math.min(expires, identity!.expiresAt.toMillis());
  await database().runTransaction(async (tx) => {
    // Cookie-derived replacement must consume a still-live parent session.
    // Reading it here serializes reissuance with logout and competing refreshes.
    // A fresh /api/auth exchange is independently authorized by its verified JWT.
    let sessionIdentity = identity;
    if (requireParentSession) {
      if (!replaceHash)
        throw new DomainError(
          'UNAUTHORIZED',
          'Sign in again before opening a new session.',
          401,
        );
      const parentSnapshot = await tx.get(sessionRef(replaceHash));
      const parent = parentSnapshot.exists
        ? (parentSnapshot.data() as SessionRecord)
        : null;
      if (
        !parent ||
        parent.kind === 'mcp' ||
        parent.expiresAt.toMillis() <= Date.now()
      )
        throw new DomainError(
          'UNAUTHORIZED',
          'The original session expired or was signed out. Sign in again.',
          401,
        );
      if (identity) {
        const verifiedParentIdentity = currentIdentity(parent);
        if (
          !verifiedParentIdentity ||
          verifiedParentIdentity.uid !== identity.uid
        )
          throw new DomainError(
            'UNAUTHORIZED',
            'The original coordinator session is no longer valid.',
            401,
          );
        sessionIdentity = verifiedParentIdentity;
        if (kind === 'owner')
          expires = Math.min(
            expires,
            verifiedParentIdentity.expiresAt.toMillis(),
          );
      }
    }
    if (circleId) {
      const record = requireCircleRecord(
        await tx.get(circleRef(circleId)),
        now,
      );
      if (record.expiresAt)
        expires = Math.min(expires, record.expiresAt.toMillis());
      if (kind === 'owner' && record.ownerUid !== identity!.uid)
        throw new DomainError('FORBIDDEN', 'Circle owner mismatch.', 403);
      if (kind === 'demo' && record.ownerUid !== null)
        throw new DomainError(
          'FORBIDDEN',
          'A demo session cannot open a personal circle.',
          403,
        );
    }
    const session: SessionRecord = {
      circleId,
      memberId,
      kind,
      uid: sessionIdentity?.uid ?? null,
      profileName: sessionIdentity?.profileName ?? null,
      identityExpiresAt: sessionIdentity?.expiresAt ?? null,
      createdAt: Timestamp.fromMillis(now),
      expiresAt: Timestamp.fromMillis(expires),
      memberEpoch: 0,
    };
    tx.create(sessionRef(await hashToken(token)), session);
    if (replaceHash) tx.delete(sessionRef(replaceHash));
  });
  return { token, maxAge: Math.max(0, Math.floor((expires - now) / 1000)) };
}
export async function verifyCoordinatorToken(
  idToken: unknown,
): Promise<VerifiedIdentity> {
  if (
    typeof idToken !== 'string' ||
    idToken.length < 20 ||
    idToken.length > 12000
  )
    throw new DomainError('INVALID_INPUT', 'A Firebase ID token is required.');
  let decoded;
  try {
    decoded = await firebaseAuth().verifyIdToken(idToken, true);
  } catch {
    throw new DomainError(
      'UNAUTHORIZED',
      'Firebase sign-in could not be verified. Sign in again.',
      401,
    );
  }
  const age = Math.floor(Date.now() / 1000) - decoded.auth_time;
  if (!Number.isFinite(age) || age < -30 || age >= 300)
    throw new DomainError(
      'RECENT_LOGIN_REQUIRED',
      'Please sign in again before opening a coordinator session.',
      401,
    );
  const profileName =
    typeof decoded.name === 'string'
      ? decoded.name
      : typeof decoded.email === 'string'
        ? decoded.email
        : null;
  return {
    uid: decoded.uid,
    profileName: profileName?.slice(0, 120) ?? null,
    expiresAt: Timestamp.fromMillis(Date.now() + DAY),
  };
}
export async function revokeBrowserSession(request: Request) {
  const raw = browserToken(request);
  if (validToken(raw)) await sessionRef(await hashToken(raw)).delete();
}
