import { Timestamp } from 'firebase-admin/firestore';
import type { Principal } from '../domain/types';
import { DomainError } from '../domain/types';
import { newToken, hashToken } from './tokens';
import {
  DAY,
  database,
  authorizedCircle,
  assertCoordinator,
  circleRef,
  invitationRef,
  sessionRef,
  requireCircleRecord,
  decodeCircle,
  type InvitationRecord,
  type SessionRecord,
} from './db';

export async function createInvitation(p: Principal, memberId: string) {
  const token = newToken();
  const hash = await hashToken(token);
  const now = Date.now();
  return database().runTransaction(async (tx) => {
    const { circle, record } = await authorizedCircle(tx, p);
    assertCoordinator(circle, p);
    const member = circle.members.find((m) => m.id === memberId);
    if (!member || member.role !== 'helper')
      throw new DomainError(
        'INVALID_INPUT',
        'Choose an exact helper in this circle. The coordinator signs in with their own account.',
      );
    const expiresAt = Timestamp.fromMillis(
      Math.min(now + 7 * DAY, record.expiresAt?.toMillis() ?? Infinity),
    );
    const invitation: InvitationRecord = {
      circleId: circle.id,
      memberId,
      memberEpoch: record.memberEpochs[memberId] ?? 0,
      createdAt: Timestamp.fromMillis(now),
      expiresAt,
      redeemedAt: null,
    };
    tx.create(invitationRef(hash), invitation);
    tx.update(circleRef(circle.id), {
      invitationHashes: { ...record.invitationHashes, [memberId]: hash },
      authRevision: record.authRevision + 1,
    });
    return {
      token,
      expiresAt: expiresAt.toDate().toISOString(),
      name: member.name,
    };
  });
}
export async function revokeHelper(p: Principal, memberId: string) {
  return database().runTransaction(async (tx) => {
    const { circle, record } = await authorizedCircle(tx, p);
    assertCoordinator(circle, p);
    const member = circle.members.find((m) => m.id === memberId);
    if (!member || member.role !== 'helper')
      throw new DomainError(
        'INVALID_INPUT',
        'Choose a helper. The coordinator cannot be revoked here.',
      );
    const invitationHashes = { ...record.invitationHashes };
    delete invitationHashes[memberId];
    tx.update(circleRef(circle.id), {
      memberEpochs: {
        ...record.memberEpochs,
        [memberId]: (record.memberEpochs[memberId] ?? 0) + 1,
      },
      invitationHashes,
      authRevision: record.authRevision + 1,
    });
    return {
      message: `${member.name}’s access and outstanding invitations were revoked.`,
    };
  });
}
export async function inspectOrRedeemInvitation(
  token: string,
  preview: boolean,
) {
  const hash = await hashToken(token);
  const sessionToken = newToken();
  const sessionHash = await hashToken(sessionToken);
  const now = Date.now();
  return database().runTransaction(async (tx) => {
    const invSnapshot = await tx.get(invitationRef(hash));
    const expired = () =>
      new DomainError(
        'INVITE_EXPIRED',
        'This invitation expired, was replaced, or was already used. Ask the coordinator for a new one.',
        410,
      );
    if (!invSnapshot.exists) throw expired();
    const inv = invSnapshot.data() as InvitationRecord;
    if (inv.redeemedAt || inv.expiresAt.toMillis() <= now) throw expired();
    const snapshot = await tx.get(circleRef(inv.circleId));
    if (!snapshot.exists) throw expired();
    const record = requireCircleRecord(snapshot, now);
    const circle = decodeCircle(record);
    if (
      record.invitationHashes[inv.memberId] !== hash ||
      (record.memberEpochs[inv.memberId] ?? 0) !== inv.memberEpoch
    )
      throw expired();
    const member = circle.members.find(
      (m) => m.id === inv.memberId && m.role === 'helper',
    );
    if (!member) throw expired();
    const expires = Math.min(
      now + 7 * DAY,
      record.expiresAt?.toMillis() ?? Infinity,
    );
    const result = {
      name: member.name,
      recipient: circle.recipient,
      expiresAt: inv.expiresAt.toDate().toISOString(),
      demo: circle.demo,
    };
    if (preview) return { ...result, token: null, maxAge: 0 };
    const session: SessionRecord = {
      circleId: circle.id,
      memberId: member.id,
      kind: 'helper',
      uid: null,
      profileName: null,
      identityExpiresAt: null,
      memberEpoch: inv.memberEpoch,
      createdAt: Timestamp.fromMillis(now),
      expiresAt: Timestamp.fromMillis(expires),
    };
    tx.create(sessionRef(sessionHash), session);
    tx.update(invSnapshot.ref, { redeemedAt: Timestamp.fromMillis(now) });
    tx.update(circleRef(circle.id), { authRevision: record.authRevision + 1 });
    return {
      ...result,
      token: sessionToken,
      maxAge: Math.floor((expires - now) / 1000),
    };
  });
}
export async function rotateMcpToken(p: Principal) {
  const token = newToken();
  const hash = await hashToken(token);
  const now = Date.now();
  return database().runTransaction(async (tx) => {
    const { circle, record } = await authorizedCircle(tx, p);
    assertCoordinator(circle, p);
    if (p.kind === 'mcp')
      throw new DomainError(
        'FORBIDDEN',
        'MCP tokens cannot mint or renew tokens.',
        403,
      );
    const expiresAt = Timestamp.fromMillis(
      Math.min(now + DAY, record.expiresAt?.toMillis() ?? Infinity),
    );
    const session: SessionRecord = {
      circleId: circle.id,
      memberId: p.memberId,
      kind: 'mcp',
      uid: null,
      profileName: null,
      identityExpiresAt: null,
      memberEpoch: 0,
      createdAt: Timestamp.fromMillis(now),
      expiresAt,
    };
    tx.create(sessionRef(hash), session);
    tx.update(circleRef(circle.id), {
      currentMcpHash: hash,
      authRevision: record.authRevision + 1,
    });
    return { token, expiresAt: expiresAt.toDate().toISOString() };
  });
}
export async function revokeMcpTokens(p: Principal) {
  await database().runTransaction(async (tx) => {
    const { circle, record } = await authorizedCircle(tx, p);
    assertCoordinator(circle, p);
    if (p.kind === 'mcp')
      throw new DomainError(
        'FORBIDDEN',
        'Use your browser session to manage tokens.',
        403,
      );
    tx.update(circleRef(circle.id), {
      currentMcpHash: null,
      authRevision: record.authRevision + 1,
    });
  });
}
