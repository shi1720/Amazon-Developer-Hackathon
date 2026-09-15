import { requirePrincipal, cookie } from '@/lib/server/auth';
import { deleteCircle } from '@/lib/server/db';
import { fail, json, checkOrigin, body } from '@/lib/server/http';
import { DomainError } from '@/lib/domain/types';
export async function DELETE(request: Request) {
  try {
    checkOrigin(request);
    const p = await requirePrincipal(request);
    const a = await body(request);
    if (!a || a.confirmation !== 'DELETE')
      throw new DomainError(
        'CONFIRMATION',
        'Type DELETE to permanently delete this circle.',
      );
    await deleteCircle(p);
    return json({ ok: true }, 200, { 'Set-Cookie': cookie(request, '', 0) });
  } catch (error) {
    return fail(error);
  }
}
