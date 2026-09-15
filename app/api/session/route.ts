import {
  sessionContext,
  issueSession,
  cookie,
  revokeBrowserSession,
} from '@/lib/server/auth';
import {
  getCircle,
  createCircle,
  resetDemoCircle,
  findOwnedCircle,
} from '@/lib/server/db';
import { json, fail, checkOrigin, body } from '@/lib/server/http';
import { seedCircle } from '@/lib/domain/seed';
import { publicCircle } from '@/lib/server/tools';
import { DomainError } from '@/lib/domain/types';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    const context = await sessionContext(request);
    const p = context?.principal;
    return json({
      signedIn: !!context?.identity,
      profileName: context?.identity?.profileName ?? null,
      ...(p
        ? {
            circle: publicCircle(await getCircle(p.circleId)),
            memberId: p.memberId,
            kind: p.kind,
          }
        : { circle: null }),
    });
  } catch (error) {
    return fail(error);
  }
}
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const a = await body(request);
    if (
      !a ||
      typeof a !== 'object' ||
      Array.isArray(a) ||
      !['demo', 'create'].includes(a.mode)
    )
      throw new DomainError('INVALID_INPUT', 'Choose demo or create.');
    const context = await sessionContext(request);
    const identity = context?.identity ?? null;
    if (a.mode === 'demo') {
      if (Object.keys(a).some((key) => key !== 'mode'))
        throw new DomainError(
          'INVALID_INPUT',
          'Demo mode does not accept personal profile fields.',
        );
      if (context?.principal?.kind === 'demo') {
        const old = await getCircle(context.principal.circleId);
        const reset = seedCircle(old.id);
        reset.version = old.version + 1;
        reset.contentVersion = (old.contentVersion ?? old.version) + 1;
        await resetDemoCircle(reset, old.version, context.principal);
        return json({
          circle: publicCircle(reset),
          memberId: 'maya',
          kind: 'demo',
          signedIn: !!identity,
          profileName: identity?.profileName ?? null,
        });
      }
      const circle = await createCircle(seedCircle(crypto.randomUUID()));
      const issued = await issueSession(
        circle.id,
        'maya',
        'demo',
        24,
        identity,
        context?.hash ?? null,
        !!context,
      );
      return json(
        {
          circle: publicCircle(circle),
          memberId: 'maya',
          kind: 'demo',
          signedIn: !!identity,
          profileName: identity?.profileName ?? null,
        },
        201,
        { 'Set-Cookie': cookie(request, issued.token, issued.maxAge) },
      );
    }
    if (!identity)
      throw new DomainError(
        'UNAUTHORIZED',
        'Sign in with Firebase to create your personal circle.',
        401,
      );
    const existing = await findOwnedCircle(identity.uid);
    let circle = existing;
    let created = false;
    if (!circle) {
      if (
        typeof a.recipient !== 'string' ||
        !a.recipient.trim() ||
        a.recipient.length > 80 ||
        typeof a.name !== 'string' ||
        !a.name.trim() ||
        a.name.length > 80 ||
        typeof a.timeZone !== 'string'
      )
        throw new DomainError(
          'INVALID_INPUT',
          'Add your name, the person this circle supports, and a time zone.',
        );
      try {
        new Intl.DateTimeFormat('en', { timeZone: a.timeZone }).format();
      } catch {
        throw new DomainError('INVALID_INPUT', 'Choose a valid time zone.');
      }
      const candidate = seedCircle(
        crypto.randomUUID(),
        false,
        a.recipient.trim(),
        a.name.trim(),
        a.timeZone,
      );
      circle = await createCircle(candidate, identity.uid);
      created = circle.id === candidate.id;
    }
    const issued = await issueSession(
      circle.id,
      'owner',
      'owner',
      24,
      identity,
      context?.hash ?? null,
      true,
    );
    return json(
      {
        circle: publicCircle(circle),
        memberId: 'owner',
        kind: 'owner',
        signedIn: true,
        profileName: identity.profileName,
      },
      created ? 201 : 200,
      { 'Set-Cookie': cookie(request, issued.token, issued.maxAge) },
    );
  } catch (error) {
    return fail(error);
  }
}
export async function DELETE(request: Request) {
  try {
    checkOrigin(request);
    await revokeBrowserSession(request);
    return json({ ok: true }, 200, { 'Set-Cookie': cookie(request, '', 0) });
  } catch (error) {
    return fail(error);
  }
}
