import { requirePrincipal } from '@/lib/server/auth';
import { rotateMcpToken, revokeMcpTokens } from '@/lib/server/access';
import { fail, json, checkOrigin } from '@/lib/server/http';
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const result = await rotateMcpToken(await requirePrincipal(request));
    return json({
      ...result,
      expiresIn: 'Up to 24 hours',
      endpoint: new URL('/mcp', request.url).toString(),
    });
  } catch (error) {
    return fail(error);
  }
}
export async function DELETE(request: Request) {
  try {
    checkOrigin(request);
    await revokeMcpTokens(await requirePrincipal(request));
    return json({ ok: true });
  } catch (error) {
    return fail(error);
  }
}
