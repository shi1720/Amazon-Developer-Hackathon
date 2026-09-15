import { requirePrincipal, newToken, hashToken } from '@/lib/server/auth';
import { getCircle, database } from '@/lib/server/db';
import { assertOwner } from '@/lib/domain/engine';
import { fail, json, checkOrigin } from '@/lib/server/http';
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const p = await requirePrincipal(request);
    const c = await getCircle(p.circleId);
    assertOwner(c, p);
    const token = newToken();
    await database().batch([
      database()
        .prepare("DELETE FROM sessions WHERE circle_id = ? AND kind = 'mcp'")
        .bind(c.id),
      database()
        .prepare(
          "INSERT INTO sessions (token_hash, circle_id, member_id, kind, expires_at) VALUES (?, ?, ?, 'mcp', ?)",
        )
        .bind(
          await hashToken(token),
          c.id,
          p.memberId,
          new Date(Date.now() + 86400000).toISOString(),
        ),
    ]);
    return json({
      token,
      expiresIn: '24 hours',
      endpoint: new URL('/mcp', request.url).toString(),
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
    await database()
      .prepare("DELETE FROM sessions WHERE circle_id = ? AND kind = 'mcp'")
      .bind(c.id)
      .run();
    return json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
