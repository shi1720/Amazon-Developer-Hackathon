import {
  Timestamp,
  type Transaction,
  type DocumentSnapshot,
} from 'firebase-admin/firestore';
import type { Circle, Principal } from '../domain/types';
import { DomainError } from '../domain/types';
import { firestore } from './firebase';
import { tokenHash } from './tokens';

export const database = firestore;
export const DAY = 86_400_000;
export interface CircleRecord {
  data: string;
  version: number;
  ownerUid: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  expiresAt: Timestamp | null;
  authRevision: number;
  memberEpochs: Record<string, number>;
  invitationHashes: Record<string, string>;
  currentMcpHash: string | null;
}
export interface SessionRecord {
  circleId: string | null;
  memberId: string;
  kind: Principal['kind'];
  uid: string | null;
  profileName: string | null;
  identityExpiresAt: Timestamp | null;
  createdAt: Timestamp;
  expiresAt: Timestamp;
  memberEpoch: number;
}
export interface InvitationRecord {
  circleId: string;
  memberId: string;
  memberEpoch: number;
  createdAt: Timestamp;
  expiresAt: Timestamp;
  redeemedAt: Timestamp | null;
}
export interface VerifiedIdentity {
  uid: string;
  profileName: string | null;
  expiresAt: Timestamp;
}
const proofs = new WeakMap<Principal, string>();
export const registerPrincipal = (p: Principal, hash: string) => {
  proofs.set(p, hash);
  return p;
};
export const circleRef = (id: string) =>
  database().collection('circles').doc(id);
export const sessionRef = (hash: string) =>
  database().collection('sessions').doc(hash);
export const ownerRef = (uid: string) =>
  database().collection('owners').doc(tokenHash(uid));
export const invitationRef = (hash: string) =>
  database().collection('invitations').doc(hash);
export function currentIdentity(
  session: SessionRecord,
  now = Date.now(),
): VerifiedIdentity | null {
  return session.uid &&
    session.identityExpiresAt &&
    session.identityExpiresAt.toMillis() > now
    ? {
        uid: session.uid,
        profileName: session.profileName,
        expiresAt: session.identityExpiresAt,
      }
    : null;
}
export function decodeCircle(record: CircleRecord): Circle {
  const c = JSON.parse(record.data) as Circle;
  return {
    ...c,
    version: record.version,
    contentVersion: c.contentVersion ?? record.version,
  };
}
export function requireCircleRecord(
  snapshot: DocumentSnapshot,
  now = Date.now(),
): CircleRecord {
  if (!snapshot.exists)
    throw new DomainError(
      'NOT_FOUND',
      'This circle is no longer available.',
      404,
    );
  const record = snapshot.data() as CircleRecord;
  if (record.expiresAt && record.expiresAt.toMillis() <= now)
    throw new DomainError(
      'SESSION_EXPIRED',
      'This demo expired. Start a fresh demo or sign in.',
      401,
    );
  return record;
}
function encoded(circle: Circle) {
  const data = JSON.stringify(circle);
  if (Buffer.byteLength(data, 'utf8') > 400_000)
    throw new DomainError(
      'LIMIT',
      'Circle storage limit reached. Export your history before starting a new circle.',
    );
  return data;
}
export function assertSessionForCircle(
  session: SessionRecord,
  hash: string,
  record: CircleRecord,
  now = Date.now(),
) {
  if (session.expiresAt.toMillis() <= now)
    throw new DomainError('UNAUTHORIZED', 'This session expired.', 401);
  const c = decodeCircle(record);
  const m = c.members.find((m) => m.id === session.memberId);
  if (!m)
    throw new DomainError(
      'UNAUTHORIZED',
      'This helper no longer belongs to the circle.',
      401,
    );
  if (session.kind === 'owner') {
    const identity = currentIdentity(session, now);
    if (
      !identity ||
      c.demo ||
      record.ownerUid !== identity.uid ||
      m.role !== 'owner'
    )
      throw new DomainError(
        'UNAUTHORIZED',
        'Sign in again to open your own circle.',
        401,
      );
  } else if (session.kind === 'demo') {
    if (!c.demo || record.ownerUid !== null || m.role !== 'owner')
      throw new DomainError(
        'UNAUTHORIZED',
        'This demo session is not valid.',
        401,
      );
  } else if (session.kind === 'helper') {
    if (
      m.role !== 'helper' ||
      session.memberEpoch !== (record.memberEpochs[m.id] ?? 0)
    )
      throw new DomainError(
        'UNAUTHORIZED',
        'Your access was revoked. Ask for a new invitation.',
        401,
      );
  } else if (session.kind === 'mcp') {
    if (m.role !== 'owner' || record.currentMcpHash !== hash)
      throw new DomainError(
        'UNAUTHORIZED',
        'This MCP token expired or was revoked.',
        401,
      );
  } else throw new DomainError('UNAUTHORIZED', 'Unknown session type.', 401);
  return c;
}
/** Read authorization and the current circle inside the same transaction as a write. */
export async function authorizedCircle(tx: Transaction, p: Principal) {
  const hash = proofs.get(p);
  if (!hash)
    throw new DomainError(
      'UNAUTHORIZED',
      'A verified server session is required.',
      401,
    );
  const [sessionSnapshot, snapshot] = await Promise.all([
    tx.get(sessionRef(hash)),
    tx.get(circleRef(p.circleId)),
  ]);
  if (!sessionSnapshot.exists)
    throw new DomainError('UNAUTHORIZED', 'This session was revoked.', 401);
  const record = requireCircleRecord(snapshot);
  const session = sessionSnapshot.data() as SessionRecord;
  if (
    (session.kind !== 'owner' && session.circleId !== p.circleId) ||
    session.kind !== p.kind
  )
    throw new DomainError(
      'UNAUTHORIZED',
      'This session does not authorize that circle.',
      401,
    );
  const c = assertSessionForCircle(session, hash, record);
  if (p.kind !== 'demo' && session.memberId !== p.memberId)
    throw new DomainError(
      'FORBIDDEN',
      'This session belongs to a different member.',
      403,
    );
  if (!c.members.some((m) => m.id === p.memberId))
    throw new DomainError('FORBIDDEN', 'Unknown circle member.', 403);
  return { record, circle: c, session, hash };
}
export function assertCoordinator(c: Circle, p: Principal) {
  if (c.members.find((m) => m.role === 'owner')?.id !== p.memberId)
    throw new DomainError(
      'FORBIDDEN',
      'Only the circle coordinator can do that.',
      403,
    );
}
export async function getCircle(id: string): Promise<Circle> {
  return decodeCircle(requireCircleRecord(await circleRef(id).get()));
}
export async function findOwnedCircle(uid: string): Promise<Circle | null> {
  const owner = await ownerRef(uid).get();
  if (!owner.exists) return null;
  const snapshot = await circleRef(owner.get('circleId') as string).get();
  if (!snapshot.exists) return null;
  const record = requireCircleRecord(snapshot);
  if (record.ownerUid !== uid)
    throw new DomainError(
      'UNAUTHORIZED',
      'Owner mapping is inconsistent.',
      401,
    );
  return decodeCircle(record);
}
/** Unique personal ownership and demo admission are both transactionally enforced. */
export async function createCircle(
  circle: Circle,
  identity: string | null = null,
): Promise<Circle> {
  const now = Date.now();
  const data = encoded(circle);
  return database().runTransaction(async (tx) => {
    const ref = circleRef(circle.id);
    if (!circle.demo) {
      if (!identity)
        throw new DomainError(
          'UNAUTHORIZED',
          'Sign in to create a circle.',
          401,
        );
      const ownedRef = ownerRef(identity);
      const owned = await tx.get(ownedRef);
      if (owned.exists) {
        const existing = await tx.get(
          circleRef(owned.get('circleId') as string),
        );
        if (existing.exists) {
          const record = requireCircleRecord(existing, now);
          if (record.ownerUid !== identity)
            throw new DomainError(
              'UNAUTHORIZED',
              'Owner mapping is inconsistent.',
              401,
            );
          return decodeCircle(record);
        }
      }
      tx.set(ownedRef, { uid: identity, circleId: circle.id });
    } else {
      const admissionRef = database()
        .collection('controls')
        .doc('demo-admission');
      const admission = (await tx.get(admissionRef)).data() ?? {};
      const leases = Object.fromEntries(
        Object.entries(admission.leases ?? {}).filter(
          ([, expiry]) => typeof expiry === 'number' && expiry > now,
        ),
      ) as Record<string, number>;
      const hour = new Date(now).toISOString().slice(0, 13);
      const count = admission.hour === hour ? Number(admission.count ?? 0) : 0;
      if (count >= 120)
        throw new DomainError(
          'RATE_LIMIT',
          'The demo is busy. Please return later or sign in to create your own circle.',
          429,
        );
      if (Object.keys(leases).length >= 500)
        throw new DomainError(
          'CAPACITY',
          'The demo is at capacity. Sign in to use your own circle.',
          429,
        );
      leases[circle.id] = now + DAY;
      tx.set(admissionRef, { hour, count: count + 1, leases });
    }
    const record: CircleRecord = {
      data,
      version: circle.version,
      ownerUid: circle.demo ? null : identity,
      createdAt: Timestamp.fromMillis(now),
      updatedAt: Timestamp.fromMillis(now),
      expiresAt: circle.demo ? Timestamp.fromMillis(now + DAY) : null,
      authRevision: 0,
      memberEpochs: {},
      invitationHashes: {},
      currentMcpHash: null,
    };
    tx.create(ref, record);
    return circle;
  });
}
/** Atomic state+events+receipt CAS; an optional principal also revalidates access. */
export async function saveCircle(
  circle: Circle,
  expectedVersion: number,
  p?: Principal,
) {
  const data = encoded(circle);
  await database().runTransaction(async (tx) => {
    const record = p
      ? (await authorizedCircle(tx, p)).record
      : requireCircleRecord(await tx.get(circleRef(circle.id)));
    if (p && p.circleId !== circle.id)
      throw new DomainError('FORBIDDEN', 'Circle scope mismatch.', 403);
    if (
      record.version !== expectedVersion ||
      circle.version !== expectedVersion + 1
    )
      throw new DomainError(
        'STALE_VERSION',
        'The circle changed. Refresh and review the latest plan.',
        409,
      );
    tx.update(circleRef(circle.id), {
      data,
      version: circle.version,
      updatedAt: Timestamp.now(),
    });
  });
}
export async function deleteCircle(p: Principal) {
  await database().runTransaction(async (tx) => {
    const { circle, record, hash } = await authorizedCircle(tx, p);
    assertCoordinator(circle, p);
    const owner = record.ownerUid
      ? await tx.get(ownerRef(record.ownerUid))
      : null;
    const admissionRef = database()
      .collection('controls')
      .doc('demo-admission');
    const admission = circle.demo ? await tx.get(admissionRef) : null;
    if (owner?.exists && owner.get('circleId') === circle.id)
      tx.delete(owner.ref);
    if (admission?.exists) {
      const leases = { ...admission.get('leases') };
      delete leases[circle.id];
      tx.update(admissionRef, { leases });
    }
    tx.delete(circleRef(circle.id));
    tx.delete(sessionRef(hash));
    // All other tokens fail immediately because their circle no longer exists.
    // Expiring authorization metadata is reclaimed by Firestore TTL.
  });
}

export async function resetDemoCircle(
  circle: Circle,
  expectedVersion: number,
  p: Principal,
) {
  const data = encoded(circle);
  await database().runTransaction(async (tx) => {
    const { circle: before, record } = await authorizedCircle(tx, p);
    if (!before.demo || p.kind !== 'demo' || circle.id !== before.id)
      throw new DomainError(
        'FORBIDDEN',
        'Only a demo session can reset its own demo.',
        403,
      );
    if (
      record.version !== expectedVersion ||
      circle.version !== expectedVersion + 1
    )
      throw new DomainError(
        'STALE_VERSION',
        'The demo changed. Refresh before resetting.',
        409,
      );
    const memberEpochs = { ...record.memberEpochs };
    for (const m of before.members)
      memberEpochs[m.id] = (memberEpochs[m.id] ?? 0) + 1;
    tx.update(circleRef(circle.id), {
      data,
      version: circle.version,
      updatedAt: Timestamp.now(),
      memberEpochs,
      invitationHashes: {},
      currentMcpHash: null,
      authRevision: record.authRevision + 1,
    });
  });
}
