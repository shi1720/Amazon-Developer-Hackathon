import { requirePrincipal } from '@/lib/server/auth';
import { createInvitation, revokeHelper } from '@/lib/server/access';
import { json, fail, checkOrigin, body } from '@/lib/server/http';
import { DomainError } from '@/lib/domain/types';
function helperId(input: unknown): string {
  if (
    !input ||
    typeof input !== 'object' ||
    !('memberId' in input) ||
    typeof input.memberId !== 'string' ||
    input.memberId.length > 100 ||
    !input.memberId
  )
    throw new DomainError('INVALID_INPUT', 'Choose an exact helper ID.');
  return input.memberId;
}
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const p = await requirePrincipal(request);
    const result = await createInvitation(p, helperId(await body(request)));
    return json({
      url: `${new URL(request.url).origin}/join#${result.token}`,
      expiresAt: result.expiresAt,
      name: result.name,
    });
  } catch (error) {
    return fail(error);
  }
}
export async function DELETE(request: Request) {
  try {
    checkOrigin(request);
    const p = await requirePrincipal(request);
    return json(await revokeHelper(p, helperId(await body(request))));
  } catch (error) {
    return fail(error);
  }
}
