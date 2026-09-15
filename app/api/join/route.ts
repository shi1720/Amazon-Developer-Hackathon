import { cookie } from '@/lib/server/auth';
import { inspectOrRedeemInvitation } from '@/lib/server/access';
import { validToken } from '@/lib/server/tokens';
import { json, fail, body, checkOrigin } from '@/lib/server/http';
import { DomainError } from '@/lib/domain/types';
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const a = await body(request);
    if (
      !a ||
      typeof a !== 'object' ||
      !validToken(a.token) ||
      (a.preview !== undefined && typeof a.preview !== 'boolean')
    )
      throw new DomainError('INVALID_INVITE', 'This invitation is not valid.');
    const result = await inspectOrRedeemInvitation(a.token, a.preview === true);
    if (a.preview)
      return json({
        name: result.name,
        recipient: result.recipient,
        expiresAt: result.expiresAt,
        demo: result.demo,
      });
    return json({ ok: true }, 200, {
      'Set-Cookie': cookie(request, result.token!, result.maxAge),
    });
  } catch (error) {
    return fail(error);
  }
}
