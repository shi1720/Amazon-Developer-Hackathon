import { env } from 'cloudflare:workers';
import type { Circle } from '../domain/types';
import { DomainError } from '../domain/types';
export function database(): D1Database {
  if (!env.DB) throw new Error('D1 DB binding is required');
  return env.DB as D1Database;
}
export async function getCircle(id: string): Promise<Circle> {
  const row = await database()
    .prepare('SELECT data, version FROM circles WHERE id = ?')
    .bind(id)
    .first<{ data: string; version: number }>();
  if (!row)
    throw new DomainError(
      'NOT_FOUND',
      'This circle is no longer available.',
      404,
    );
  const c = JSON.parse(row.data);
  return {
    ...c,
    version: row.version,
    contentVersion: c.contentVersion ?? row.version,
  };
}
export async function createCircle(
  circle: Circle,
  identity: string | null = null,
) {
  const now = new Date().toISOString();
  const sql = circle.demo
    ? 'INSERT INTO circles (id, owner_identity, version, data, created_at, updated_at) SELECT ?, ?, ?, ?, ?, ? WHERE (SELECT COUNT(*) FROM circles WHERE owner_identity IS NULL) < 500'
    : 'INSERT INTO circles (id, owner_identity, version, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)';
  const result = await database()
    .prepare(sql)
    .bind(circle.id, identity, circle.version, JSON.stringify(circle), now, now)
    .run();
  if (result.meta.changes !== 1)
    throw new DomainError(
      'CAPACITY',
      'The demo is at capacity. Sign in to use your own circle.',
      429,
    );
}
export async function saveCircle(circle: Circle, expectedVersion: number) {
  const bytes = new TextEncoder().encode(JSON.stringify(circle));
  if (bytes.length > 400000)
    throw new DomainError(
      'LIMIT',
      'Circle storage limit reached. Export your history and remove older commitments.',
    );
  const r = await database()
    .prepare(
      'UPDATE circles SET data = ?, version = ?, updated_at = ? WHERE id = ? AND version = ?',
    )
    .bind(
      JSON.stringify(circle),
      expectedVersion + 1,
      new Date().toISOString(),
      circle.id,
      expectedVersion,
    )
    .run();
  if (r.meta.changes !== 1)
    throw new DomainError(
      'STALE_VERSION',
      'The circle changed while this action was being prepared. Refresh and review the latest plan.',
      409,
    );
}
