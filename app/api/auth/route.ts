import {
  verifyCoordinatorToken,
  issueSession,
  sessionContext,
  cookie,
} from '@/lib/server/auth';
import { findOwnedCircle } from '@/lib/server/db';
import { body, checkOrigin, fail, json } from '@/lib/server/http';
import { publicCircle } from '@/lib/server/tools';
import { DomainError } from '@/lib/domain/types';
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const input = await body(request);
    if (
      !input ||
      typeof input !== 'object' ||
      Array.isArray(input) ||
      Object.keys(input).some((k) => k !== 'idToken')
    )
      throw new DomainError('INVALID_INPUT', 'Send only a Firebase idToken.');
    const identity = await verifyCoordinatorToken(input.idToken);
    const existing = await sessionContext(request);
    const circle = await findOwnedCircle(identity.uid);
    const issued = await issueSession(
      circle?.id ?? null,
      'owner',
      'owner',
      24,
      identity,
      existing?.hash ?? null,
    );
    return json(
      {
        ok: true,
        signedIn: true,
        profileName: identity.profileName,
        circle: circle ? publicCircle(circle) : null,
        memberId: 'owner',
        kind: 'owner',
      },
      200,
      { 'Set-Cookie': cookie(request, issued.token, issued.maxAge) },
    );
  } catch (error) {
    return fail(error);
  }
}
