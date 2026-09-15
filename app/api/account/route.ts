import { requirePrincipal, cookie } from '@/lib/server/auth';
import { getCircle, database } from '@/lib/server/db';
import { assertOwner } from '@/lib/domain/engine';
import { fail, json, checkOrigin, body } from '@/lib/server/http';
import { DomainError } from '@/lib/domain/types';
export async function DELETE(request: Request) {
  try {
    checkOrigin(request);
    const p = await requirePrincipal(request);
    const c = await getCircle(p.circleId);
    assertOwner(c, p);
    const a = await body(request);
    if (a.confirmation !== 'DELETE')
      throw new DomainError(
        'CONFIRMATION',
        'Type DELETE to permanently delete this circle.',
      );
    await database().batch([
      database()
        .prepare('DELETE FROM invitations WHERE circle_id = ?')
        .bind(c.id),
      database().prepare('DELETE FROM sessions WHERE circle_id = ?').bind(c.id),
      database().prepare('DELETE FROM circles WHERE id = ?').bind(c.id),
    ]);
    return json({ ok: true }, 200, { 'Set-Cookie': cookie(request, '', 0) });
  } catch (e) {
    return fail(e);
  }
}
