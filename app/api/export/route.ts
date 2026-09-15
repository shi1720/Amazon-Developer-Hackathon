import { requirePrincipal } from '@/lib/server/auth';
import { getCircle } from '@/lib/server/db';
import { assertOwner } from '@/lib/domain/engine';
import { fail } from '@/lib/server/http';
import { publicCircle } from '@/lib/server/tools';
export async function GET(request: Request) {
  try {
    const p = await requirePrincipal(request);
    const c = await getCircle(p.circleId, p);
    assertOwner(c, p);
    return new Response(
      JSON.stringify(
        {
          exportedAt: new Date().toISOString(),
          schemaVersion: 1,
          circle: publicCircle(c),
        },
        null,
        2,
      ),
      {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition':
            'attachment; filename="kindhandoff-circle.json"',
          'Cache-Control': 'no-store',
        },
      },
    );
  } catch (e) {
    return fail(e);
  }
}
