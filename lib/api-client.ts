import type { Snapshot } from './domain/types';

export type SessionResponse = Snapshot | { circle: null; signedIn: boolean };
export type Invitation = { url: string; expiresAt: string; name: string };
export type InvitationPreview = {
  name: string;
  recipient: string;
  expiresAt: string;
  demo: boolean;
};
export type McpToken = { token: string; endpoint: string; expiresIn: string };
type Ok = { ok: true };
export type ApiResponses = {
  '/api/session': { GET: SessionResponse; POST: Snapshot; DELETE: Ok };
  '/api/invite': { POST: Invitation; DELETE: { message: string } };
  '/api/token': { POST: McpToken; DELETE: Ok };
  '/api/account': { DELETE: Ok };
  '/api/join': { POST: InvitationPreview | Ok };
};

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function responseError(value: unknown): string | undefined {
  if (!isRecord(value) || !isRecord(value.error)) return undefined;
  return typeof value.error.message === 'string'
    ? value.error.message
    : 'Unable to complete this request.';
}

// The overloads mirror the same-origin route contracts; JSON stays unknown
// until HTTP and the shared error envelope have been checked.
export function api(path: '/api/session'): Promise<SessionResponse>;
export function api<
  P extends keyof ApiResponses,
  M extends keyof ApiResponses[P],
>(path: P, method: M, data?: unknown): Promise<ApiResponses[P][M]>;
export async function api(
  path: string,
  method = 'GET',
  data?: unknown,
): Promise<unknown> {
  const response = await fetch(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(data ? { body: JSON.stringify(data) } : {}),
  });
  const value: unknown = await response.json();
  const error = responseError(value);
  if (!response.ok || error)
    throw new Error(error ?? 'Unable to complete this request.');
  if (!isRecord(value))
    throw new Error('The server returned an invalid response.');
  return value;
}
