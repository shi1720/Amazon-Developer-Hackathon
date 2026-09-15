import { database } from './db';
import { DomainError, type Principal } from '../domain/types';
export const COOKIE = 'dayweave_session';
export const newToken = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(32)), (v) =>
    v.toString(16).padStart(2, '0'),
  ).join('');
export async function hashToken(value: string) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)),
    ),
    (v) => v.toString(16).padStart(2, '0'),
  ).join('');
}
export function cookie(request: Request, value: string, maxAge = 86400) {
  return `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${new URL(request.url).protocol === 'https:' ? '; Secure' : ''}`;
}
export async function issueSession(
  circleId: string,
  memberId: string,
  kind: string,
  hours = 24,
) {
  const token = newToken();
  await database()
    .prepare(
      'INSERT INTO sessions (token_hash, circle_id, member_id, kind, expires_at) VALUES (?, ?, ?, ?, ?)',
    )
    .bind(
      await hashToken(token),
      circleId,
      memberId,
      kind,
      new Date(Date.now() + hours * 3600000).toISOString(),
    )
    .run();
  return token;
}
export async function principal(
  request: Request,
  allowMcpBearer = false,
): Promise<Principal | null> {
  const auth = request.headers.get('authorization');
  if (auth && !allowMcpBearer)
    throw new DomainError(
      'FORBIDDEN',
      'MCP bearer tokens are restricted to the MCP endpoint.',
      403,
    );
  const bearer = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
  const raw =
    bearer ??
    request.headers
      .get('cookie')
      ?.split(';')
      .map((s) => s.trim())
      .find((s) => s.startsWith(COOKIE + '='))
      ?.slice(COOKIE.length + 1);
  if (raw) {
    const session = await database()
      .prepare(
        'SELECT s.circle_id, s.member_id, s.kind FROM sessions s JOIN circles c ON c.id = s.circle_id WHERE s.token_hash = ? AND s.expires_at > ? AND (c.owner_identity IS NOT NULL OR c.created_at > ?)',
      )
      .bind(
        await hashToken(raw),
        new Date().toISOString(),
        new Date(Date.now() - 86400000).toISOString(),
      )
      .first<{
        circle_id: string;
        member_id: string;
        kind: Principal['kind'];
      }>();
    if (session) {
      if (session.kind === 'mcp' && (!allowMcpBearer || !bearer))
        throw new DomainError(
          'FORBIDDEN',
          'MCP tokens require the MCP endpoint and Bearer authentication.',
          403,
        );
      if (bearer && session.kind !== 'mcp')
        throw new DomainError(
          'UNAUTHORIZED',
          'Use a dedicated MCP token.',
          401,
        );
      return {
        circleId: session.circle_id,
        memberId: session.member_id,
        kind: session.kind,
      };
    }
    if (bearer)
      throw new DomainError(
        'UNAUTHORIZED',
        'This MCP token expired or was revoked.',
        401,
      );
  }
  if (!bearer) {
    const identity = request.headers.get('oai-authenticated-user-id');
    const email = request.headers.get('oai-authenticated-user-email');
    if (identity && email) {
      const row = await database()
        .prepare('SELECT id FROM circles WHERE owner_identity = ?')
        .bind(identity)
        .first<{ id: string }>();
      if (row)
        return { circleId: row.id, memberId: 'owner', kind: 'owner', identity };
    }
  }
  return null;
}
export async function requirePrincipal(
  request: Request,
  allowMcpBearer = false,
) {
  const p = await principal(request, allowMcpBearer);
  if (!p)
    throw new DomainError(
      'UNAUTHORIZED',
      'Open your circle or start an isolated demo first.',
      401,
    );
  if (p.kind === 'demo') {
    const actor = request.headers.get('x-dayweave-demo-member');
    if (actor) p.memberId = actor;
  }
  return p;
}
export function requireOwner(p: Principal, ownerId: string) {
  if (p.memberId !== ownerId)
    throw new DomainError(
      'FORBIDDEN',
      'Only the circle coordinator can do that.',
      403,
    );
}
