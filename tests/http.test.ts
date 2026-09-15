import { expect, it } from 'vitest';
import { readBoundedText, checkOrigin } from '../lib/server/http';
it('rejects and cancels streaming bodies before buffering everything', async () => {
  let pulls = 0,
    cancelled = false;
  const body = new ReadableStream({
    pull(controller) {
      pulls++;
      controller.enqueue(new Uint8Array(1000));
      if (pulls === 100) controller.close();
    },
    cancel() {
      cancelled = true;
    },
  });
  const request = new Request('https://kindhandoff.test', {
    method: 'POST',
    body,
    duplex: 'half',
  } as RequestInit);
  await expect(readBoundedText(request)).rejects.toMatchObject({ status: 413 });
  expect(cancelled).toBe(true);
  expect(pulls).toBeLessThan(35);
});
it('allows a bounded JSON body', async () =>
  expect(
    await readBoundedText(
      new Request('https://kindhandoff.test', {
        method: 'POST',
        body: '{"ok":true}',
      }),
    ),
  ).toBe('{"ok":true}'));
it('rejects a cross-origin browser mutation', () =>
  expect(() =>
    checkOrigin(
      new Request('https://kindhandoff.test/api', {
        headers: { Origin: 'https://evil.test' },
      }),
    ),
  ).toThrow());
