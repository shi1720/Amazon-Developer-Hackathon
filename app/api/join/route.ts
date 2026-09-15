import { database, getCircle } from '@/lib/server/db';
import { hashToken, newToken, cookie } from '@/lib/server/auth';
import { json, fail, body, checkOrigin } from '@/lib/server/http';
import { DomainError } from '@/lib/domain/types';
import { member } from '@/lib/domain/engine';
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const a = await body(request);
    if (typeof a.token !== 'string' || !/^[a-f0-9]{64}$/.test(a.token))
      throw new DomainError(
        'INVALID_INVITE',
        'This invitation is not valid.',
        400,
      );
    const hash = await hashToken(a.token);
    const now = new Date().toISOString();
    const inv = await database()
      .prepare(
        'SELECT circle_id, member_id, expires_at FROM invitations WHERE token_hash = ? AND redeemed_at IS NULL AND expires_at > ?',
      )
      .bind(hash, now)
      .first<{ circle_id: string; member_id: string; expires_at: string }>();
    if (!inv)
      throw new DomainError(
        'INVITE_EXPIRED',
        'This invitation expired or was already used. Ask the coordinator for a new one.',
        410,
      );
    const c = await getCircle(inv.circle_id);
    const m = member(c, inv.member_id);
    if (a.preview)
      return json({
        name: m.name,
        recipient: c.recipient,
        expiresAt: inv.expires_at,
        demo: c.demo,
      });
    const sessionToken = newToken();
    const result = await database().batch([
      database()
        .prepare(
          "INSERT INTO sessions (token_hash, circle_id, member_id, kind, expires_at) SELECT ?, circle_id, member_id, 'helper', ? FROM invitations WHERE token_hash = ? AND redeemed_at IS NULL AND expires_at > ?",
        )
        .bind(
          await hashToken(sessionToken),
          new Date(Date.now() + 7 * 86400000).toISOString(),
          hash,
          now,
        ),
      database()
        .prepare(
          'UPDATE invitations SET redeemed_at = ? WHERE token_hash = ? AND redeemed_at IS NULL AND expires_at > ?',
        )
        .bind(now, hash, now),
    ]);
    if (result[0].meta.changes !== 1)
      throw new DomainError(
        'INVITE_EXPIRED',
        'This invitation was already used.',
        410,
      );
    return json({ ok: true }, 200, {
      'Set-Cookie': cookie(request, sessionToken, 7 * 86400),
    });
  } catch (e) {
    return fail(e);
  }
}
