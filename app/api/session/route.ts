import {
  principal,
  issueSession,
  cookie,
  COOKIE,
  hashToken,
} from '@/lib/server/auth';
import { database, getCircle, createCircle, saveCircle } from '@/lib/server/db';
import { json, fail, checkOrigin, body } from '@/lib/server/http';
import { seedCircle } from '@/lib/domain/seed';
import { publicCircle } from '@/lib/server/tools';
import { DomainError } from '@/lib/domain/types';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    const p = await principal(request);
    const signedIn = !!request.headers.get('oai-authenticated-user-id');
    return json({
      signedIn,
      profileName: request.headers.get('oai-authenticated-user-email') ?? null,
      ...(p
        ? {
            circle: publicCircle(await getCircle(p.circleId)),
            memberId: p.memberId,
            kind: p.kind,
          }
        : { circle: null }),
    });
  } catch (e) {
    return fail(e);
  }
}
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const a = await body(request);
    if (!['demo', 'create'].includes(a.mode))
      throw new DomainError('INVALID_INPUT', 'Choose demo or create.');
    const identity = request.headers.get('oai-authenticated-user-id');
    if (a.mode === 'create' && !identity)
      throw new DomainError(
        'UNAUTHORIZED',
        'Sign in to create a personal circle.',
        401,
      );
    if (a.mode === 'demo') {
      const existingDemo = await principal(request);
      if (existingDemo?.kind === 'demo') {
        const old = await getCircle(existingDemo.circleId);
        const reset = seedCircle(old.id);
        reset.version = old.version + 1;
        await saveCircle(reset, old.version);
        return json({
          circle: publicCircle(reset),
          memberId: 'maya',
          kind: 'demo',
          signedIn: !!identity,
        });
      }
      const db = database();
      const now = new Date().toISOString();
      const cutoff = new Date(Date.now() - 86400000).toISOString();
      await db.batch([
        db
          .prepare(
            'DELETE FROM circles WHERE id IN (SELECT id FROM circles WHERE owner_identity IS NULL AND created_at < ? LIMIT 100)',
          )
          .bind(cutoff),
        db.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(now),
        db.prepare('DELETE FROM invitations WHERE expires_at < ?').bind(now),
        db.prepare('DELETE FROM rate_limits WHERE expires_at < ?').bind(now),
      ]);
      const bucket = 'demo:' + now.slice(0, 13);
      const quota = await db
        .prepare(
          'INSERT INTO rate_limits (bucket, count, expires_at) VALUES (?, 1, ?) ON CONFLICT(bucket) DO UPDATE SET count = count + 1 WHERE count < 120',
        )
        .bind(bucket, new Date(Date.now() + 3600000).toISOString())
        .run();
      if (quota.meta.changes !== 1)
        throw new DomainError(
          'RATE_LIMIT',
          'The demo is busy. Please return in an hour or sign in to use your personal circle.',
          429,
        );
      const active = await db
        .prepare(
          'SELECT COUNT(*) AS count FROM circles WHERE owner_identity IS NULL',
        )
        .first<{ count: number }>();
      if ((active?.count ?? 0) >= 500)
        throw new DomainError(
          'CAPACITY',
          'The demo has reached its capacity. Sign in to create your own circle.',
          429,
        );
    }
    if (a.mode === 'create') {
      const existing = await database()
        .prepare('SELECT id FROM circles WHERE owner_identity = ?')
        .bind(identity)
        .first<{ id: string }>();
      if (existing)
        return json(
          {
            circle: publicCircle(await getCircle(existing.id)),
            memberId: 'owner',
            kind: 'owner',
            signedIn: true,
          },
          200,
          { 'Set-Cookie': cookie(request, '', 0) },
        );
      if (
        typeof a.recipient !== 'string' ||
        a.recipient.trim().length < 1 ||
        a.recipient.length > 80 ||
        typeof a.name !== 'string' ||
        a.name.length > 80 ||
        !a.name.trim()
      )
        throw new DomainError(
          'INVALID_INPUT',
          'Add your name and the person this circle supports.',
        );
      try {
        new Intl.DateTimeFormat('en', { timeZone: a.timeZone }).format();
      } catch {
        throw new DomainError('INVALID_INPUT', 'Choose a valid time zone.');
      }
    }
    const circle =
      a.mode === 'demo'
        ? seedCircle(crypto.randomUUID())
        : seedCircle(
            crypto.randomUUID(),
            false,
            a.recipient.trim(),
            a.name.trim(),
            a.timeZone,
          );
    await createCircle(circle, a.mode === 'create' ? identity : null);
    if (a.mode === 'demo') {
      const token = await issueSession(circle.id, 'maya', 'demo');
      return json(
        {
          circle: publicCircle(circle),
          memberId: 'maya',
          kind: 'demo',
          signedIn: !!identity,
        },
        201,
        { 'Set-Cookie': cookie(request, token) },
      );
    }
    return json(
      {
        circle: publicCircle(circle),
        memberId: 'owner',
        kind: 'owner',
        signedIn: true,
      },
      201,
      { 'Set-Cookie': cookie(request, '', 0) },
    );
  } catch (e) {
    return fail(e);
  }
}
export async function DELETE(request: Request) {
  try {
    checkOrigin(request);
    const raw = request.headers
      .get('cookie')
      ?.split(';')
      .map((s) => s.trim())
      .find((s) => s.startsWith(COOKIE + '='))
      ?.slice(COOKIE.length + 1);
    if (raw)
      await database()
        .prepare('DELETE FROM sessions WHERE token_hash = ?')
        .bind(await hashToken(raw))
        .run();
    return json({ ok: true }, 200, { 'Set-Cookie': cookie(request, '', 0) });
  } catch (e) {
    return fail(e);
  }
}
