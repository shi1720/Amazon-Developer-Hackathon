import { requirePrincipal, newToken, hashToken } from '@/lib/server/auth';
import { database, getCircle } from '@/lib/server/db';
import { json, fail, checkOrigin, body } from '@/lib/server/http';
import { assertOwner, member } from '@/lib/domain/engine';
import { DomainError } from '@/lib/domain/types';
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const p = await requirePrincipal(request);
    const c = await getCircle(p.circleId);
    assertOwner(c, p);
    const a = await body(request);
    const m = member(c, a.memberId);
    if (m.role === 'owner')
      throw new DomainError(
        'INVALID_INPUT',
        'The coordinator signs in with their own account.',
      );
    const token = newToken();
    const expiresAt = new Date(Date.now() + 7 * 86400000).toISOString();
    await database().batch([
      database()
        .prepare(
          'DELETE FROM invitations WHERE circle_id = ? AND member_id = ?',
        )
        .bind(c.id, m.id),
      database()
        .prepare(
          'INSERT INTO invitations (token_hash, circle_id, member_id, expires_at) VALUES (?, ?, ?, ?)',
        )
        .bind(await hashToken(token), c.id, m.id, expiresAt),
    ]);
    return json({
      url: `${new URL(request.url).origin}/join#${token}`,
      expiresAt,
      name: m.name,
    });
  } catch (e) {
    return fail(e);
  }
}
export async function DELETE(request: Request) {
  try {
    checkOrigin(request);
    const p = await requirePrincipal(request);
    const c = await getCircle(p.circleId);
    assertOwner(c, p);
    const a = await body(request);
    const m = member(c, a.memberId);
    if (m.role === 'owner')
      throw new DomainError('INVALID_INPUT', 'Cannot revoke the coordinator.');
    await database().batch([
      database()
        .prepare(
          'DELETE FROM invitations WHERE circle_id = ? AND member_id = ?',
        )
        .bind(c.id, m.id),
      database()
        .prepare('DELETE FROM sessions WHERE circle_id = ? AND member_id = ?')
        .bind(c.id, m.id),
    ]);
    return json({
      message: `${m.name}’s access and outstanding invitations were revoked.`,
    });
  } catch (e) {
    return fail(e);
  }
}
