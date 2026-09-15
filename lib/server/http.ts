import { DomainError } from '../domain/types';
export function json(
  value: unknown,
  status = 200,
  extra: Record<string, string> = {},
) {
  return Response.json(value, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      ...extra,
    },
  });
}
export function fail(error: unknown) {
  if (error instanceof DomainError)
    return json(
      { error: { code: error.code, message: error.message } },
      error.status,
    );
  console.error(
    'Dayweave request failed',
    error instanceof Error ? error.message : 'Unknown error',
  );
  return json(
    {
      error: {
        code: 'INTERNAL',
        message:
          'Something went wrong. Your last saved plan is still available. Please try again.',
      },
    },
    500,
  );
}
export function checkOrigin(request: Request, bearerAllowed = false) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin)
    throw new DomainError(
      'ORIGIN',
      'This request must come from Dayweave.',
      403,
    );
  if (
    !origin &&
    !bearerAllowed &&
    request.headers.get('sec-fetch-site') === 'cross-site'
  )
    throw new DomainError('ORIGIN', 'Cross-site request rejected.', 403);
}
export async function readBoundedText(request: Request, limit = 32000) {
  if (Number(request.headers.get('content-length') || 0) > limit)
    throw new DomainError('LIMIT', 'Request is too large.', 413);
  if (!request.body) return '';
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw new DomainError('LIMIT', 'Request is too large.', 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return new TextDecoder().decode(bytes);
}
export async function body(request: Request) {
  const raw = await readBoundedText(request);
  try {
    return JSON.parse(raw);
  } catch {
    throw new DomainError('INVALID_INPUT', 'Use a valid JSON request.');
  }
}
