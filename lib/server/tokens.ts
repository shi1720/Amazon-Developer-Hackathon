import { createHash, randomBytes } from 'node:crypto';
export const newToken = () => randomBytes(32).toString('hex');
export const tokenHash = (value: string) =>
  createHash('sha256').update(value).digest('hex');
export async function hashToken(value: string) {
  return tokenHash(value);
}
export const validToken = (value: unknown): value is string =>
  typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
