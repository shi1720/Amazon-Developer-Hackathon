import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { Timestamp } from 'firebase-admin/firestore';
import { seedCircle } from '../domain/seed';
import {
  DAY,
  database,
  createCircle,
  getCircle,
  circleRef,
  sessionRef,
  ownerRef,
  deleteCircle,
  type VerifiedIdentity,
} from './db';
import { issueSession, requirePrincipal, hashToken, COOKIE } from './auth';
import {
  createInvitation,
  inspectOrRedeemInvitation,
  revokeHelper,
  rotateMcpToken,
} from './access';
import { runTool } from './tools';
import * as firebase from './firebase';
import * as persistence from './db';
import * as sessions from '../../app/api/session/route';
import * as login from '../../app/api/auth/route';

// Never clear a developer's demo or a production database. This suite requires
// its own emulator project and loopback host, both explicitly provided by runner.
const project = process.env.GCLOUD_PROJECT ?? '';
const host = process.env.FIRESTORE_EMULATOR_HOST ?? '';
const enabled =
  project.startsWith('demo-kindhandoff-backend-tests') &&
  /^(127\.0\.0\.1|localhost|\[::1\]):\d+$/.test(host);
const suite = enabled ? describe : describe.skip;
const origin = 'http://localhost:3001';
const request = (
  path = '/mcp',
  token?: string,
  data?: unknown,
  extra: Record<string, string> = {},
) =>
  new Request(origin + path, {
    method: data === undefined ? 'GET' : 'POST',
    headers: {
      origin,
      ...(token ? { cookie: `${COOKIE}=${token}` } : {}),
      ...(data === undefined ? {} : { 'content-type': 'application/json' }),
      ...extra,
    },
    ...(data === undefined ? {} : { body: JSON.stringify(data) }),
  });
const cookieToken = (response: Response) =>
  response.headers
    .get('set-cookie')!
    .split(';')[0]!
    .slice(COOKIE.length + 1);
const identity = (uid = crypto.randomUUID()): VerifiedIdentity => ({
  uid,
  profileName: 'Test coordinator',
  expiresAt: Timestamp.fromMillis(Date.now() + DAY),
});
async function owner() {
  const user = identity();
  const circle = seedCircle(
    crypto.randomUUID(),
    false,
    'Arun',
    'Shivam',
    'Asia/Kolkata',
  );
  circle.members.push({
    id: 'jo',
    name: 'Jo',
    role: 'helper',
    relation: 'Friend',
    color: 'av-blue',
    canAccept: true,
    capabilities: ['company'],
    availability: [
      { start: '2030-01-01T10:00:00.000Z', end: '2030-01-01T18:00:00.000Z' },
    ],
  });
  await createCircle(circle, user.uid);
  const issued = await issueSession(circle.id, 'owner', 'owner', 24, user);
  const p = await requirePrincipal(request('/mcp', issued.token), true);
  return { user, circle, token: issued.token, p };
}
async function helper(fixture: Awaited<ReturnType<typeof owner>>) {
  const invite = await createInvitation(fixture.p, 'jo');
  const joined = await inspectOrRedeemInvitation(invite.token, false);
  const p = await requirePrincipal(request('/mcp', joined.token!), true);
  return { token: joined.token!, p };
}
const write = (
  version = 0,
  text = 'A practical note',
  requestId = crypto.randomUUID(),
) => ({ expectedVersion: version, requestId, text });

suite('Firestore persistence and server authorization', () => {
  beforeEach(async () => {
    const result = await fetch(
      `http://${host}/emulator/v1/projects/${project}/databases/(default)/documents`,
      { method: 'DELETE' },
    );
    expect(result.ok).toBe(true);
  });
  afterEach(() => vi.restoreAllMocks());

  it('keeps one personal circle per verified UID under concurrent creation', async () => {
    const uid = crypto.randomUUID();
    const [a, b] = await Promise.all([
      createCircle(seedCircle(crypto.randomUUID(), false), uid),
      createCircle(seedCircle(crypto.randomUUID(), false), uid),
    ]);
    expect(a.id).toBe(b.id);
    expect((await database().collection('circles').get()).size).toBe(1);
    expect((await ownerRef(uid).get()).get('circleId')).toBe(a.id);
  });

  it('atomically saves state, audit events, and a replay receipt', async () => {
    const f = await owner();
    const args = write();
    await runTool('add_note', args, f.p);
    const replay = await runTool('add_note', args, f.p);
    expect(replay).toMatchObject({ replayed: true });
    const stored = await getCircle(f.circle.id);
    expect(stored.version).toBe(1);
    expect(stored.notes).toHaveLength(1);
    expect(stored.receipts).toHaveLength(1);
    expect(stored.events).toHaveLength(1);
    await expect(
      runTool('add_note', { ...args, text: 'Different data' }, f.p),
    ).rejects.toMatchObject({ code: 'IDEMPOTENCY_CONFLICT' });
  });

  it('permits only one concurrent write against a circle revision', async () => {
    const f = await owner();
    const results = await Promise.allSettled([
      runTool('add_note', write(), f.p),
      runTool('add_note', write(), f.p),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.find((r) => r.status === 'rejected')).toMatchObject({
      reason: { code: 'STALE_VERSION' },
    });
    const c = await getCircle(f.circle.id);
    expect(c.version).toBe(1);
    expect(c.notes).toHaveLength(1);
  });

  it('redeems an invitation once even with concurrent requests', async () => {
    const f = await owner();
    const invitation = await createInvitation(f.p, 'jo');
    const results = await Promise.allSettled([
      inspectOrRedeemInvitation(invitation.token, false),
      inspectOrRedeemInvitation(invitation.token, false),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.find((r) => r.status === 'rejected')).toMatchObject({
      reason: { code: 'INVITE_EXPIRED' },
    });
    expect(
      (
        await database()
          .collection('sessions')
          .where('kind', '==', 'helper')
          .get()
      ).size,
    ).toBe(1);
  });

  it('replacing an invitation invalidates the old link', async () => {
    const f = await owner();
    const first = await createInvitation(f.p, 'jo');
    const second = await createInvitation(f.p, 'jo');
    await expect(
      inspectOrRedeemInvitation(first.token, false),
    ).rejects.toMatchObject({ code: 'INVITE_EXPIRED' });
    expect(
      (await inspectOrRedeemInvitation(second.token, false)).token,
    ).toBeTruthy();
  });

  it('member epochs revoke existing cookies, outstanding invitations, and in-flight writes', async () => {
    const f = await owner();
    const h = await helper(f);
    const inv = await createInvitation(f.p, 'jo');
    await revokeHelper(f.p, 'jo');
    await expect(
      requirePrincipal(request('/mcp', h.token), true),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    await expect(
      inspectOrRedeemInvitation(inv.token, false),
    ).rejects.toMatchObject({ code: 'INVITE_EXPIRED' });
    await expect(runTool('add_note', write(), h.p)).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    });
    expect((await getCircle(f.circle.id)).notes).toHaveLength(0);
    // No unbounded token deletion is required for revocation to take effect.
    expect((await sessionRef(await hashToken(h.token)).get()).exists).toBe(
      true,
    );
  });

  it('serializes MCP token rotation and rejects cookie/admin token reuse', async () => {
    const f = await owner();
    const tokens = await Promise.all([
      rotateMcpToken(f.p),
      rotateMcpToken(f.p),
    ]);
    const results = await Promise.allSettled(
      tokens.map((t) =>
        requirePrincipal(
          request('/mcp', undefined, undefined, {
            authorization: `Bearer ${t.token}`,
          }),
          true,
        ),
      ),
    );
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const active = tokens[results.findIndex((r) => r.status === 'fulfilled')]!;
    await expect(
      requirePrincipal(
        request('/api/token', undefined, undefined, {
          authorization: `Bearer ${active.token}`,
        }),
      ),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(
      requirePrincipal(request('/api/token', active.token)),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('revokes an already-authenticated MCP mutation after token rotation', async () => {
    const f = await owner();
    const old = await rotateMcpToken(f.p);
    const p = await requirePrincipal(
      request('/mcp', undefined, undefined, {
        authorization: `Bearer ${old.token}`,
      }),
      true,
    );
    await rotateMcpToken(f.p);
    await expect(runTool('add_note', write(), p)).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    });
  });

  it('never lets helper cookies impersonate a demo actor or become MCP credentials', async () => {
    const f = await owner();
    const h = await helper(f);
    expect(
      (
        await requirePrincipal(
          request('/mcp', h.token, undefined, {
            'x-dayweave-demo-member': 'owner',
          }),
          true,
        )
      ).memberId,
    ).toBe('jo');
    await expect(
      requirePrincipal(
        request('/mcp', undefined, undefined, {
          authorization: `Bearer ${h.token}`,
        }),
        true,
      ),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('enforces active demo capacity transactionally at the boundary', async () => {
    const now = Date.now();
    await database()
      .collection('controls')
      .doc('demo-admission')
      .set({
        hour: new Date(now).toISOString().slice(0, 13),
        count: 0,
        leases: Object.fromEntries(
          Array.from({ length: 499 }, (_, i) => [`lease-${i}`, now + DAY]),
        ),
      });
    const results = await Promise.allSettled([
      createCircle(seedCircle(crypto.randomUUID())),
      createCircle(seedCircle(crypto.randomUUID())),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.find((r) => r.status === 'rejected')).toMatchObject({
      reason: { code: 'CAPACITY' },
    });
    expect(
      Object.keys(
        (
          await database().collection('controls').doc('demo-admission').get()
        ).get('leases'),
      ),
    ).toHaveLength(500);
  });

  it('enforces the demo hourly quota under concurrent admission', async () => {
    const now = Date.now();
    await database()
      .collection('controls')
      .doc('demo-admission')
      .set({
        hour: new Date(now).toISOString().slice(0, 13),
        count: 119,
        leases: {},
      });
    const results = await Promise.allSettled([
      createCircle(seedCircle(crypto.randomUUID())),
      createCircle(seedCircle(crypto.randomUUID())),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.find((r) => r.status === 'rejected')).toMatchObject({
      reason: { code: 'RATE_LIMIT' },
    });
  });

  it('rejects expired demos before asynchronous Firestore TTL deletion', async () => {
    const c = await createCircle(seedCircle(crypto.randomUUID()));
    const issued = await issueSession(c.id, 'maya', 'demo');
    await circleRef(c.id).update({
      expiresAt: Timestamp.fromMillis(Date.now() - 1),
    });
    await expect(
      requirePrincipal(request('/mcp', issued.token), true),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    expect((await circleRef(c.id).get()).exists).toBe(true);
  });

  it('verifies Firebase tokens with revocation checks and preserves login across demo/create', async () => {
    const verify = vi.fn().mockResolvedValue({
      uid: 'firebase-owner',
      name: 'Shivam',
      auth_time: Math.floor(Date.now() / 1000),
    });
    vi.spyOn(firebase, 'firebaseAuth').mockReturnValue({
      verifyIdToken: verify,
    } as unknown as ReturnType<typeof firebase.firebaseAuth>);
    const response = await login.POST(
      request('/api/auth', undefined, {
        idToken: 'mock-firebase-id-token-for-test',
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.clone().json()).toMatchObject({
      ok: true,
      signedIn: true,
      circle: null,
    });
    expect(verify).toHaveBeenCalledWith(
      'mock-firebase-id-token-for-test',
      true,
    );
    expect(response.headers.get('set-cookie')).toMatch(
      /^__session=[a-f0-9]{64};/,
    );
    const before = await sessions.GET(
      request('/api/session', cookieToken(response)),
    );
    expect(await before.json()).toMatchObject({ signedIn: true, circle: null });
    const demo = await sessions.POST(
      request('/api/session', cookieToken(response), { mode: 'demo' }),
    );
    expect(demo.status).toBe(201);
    expect(await demo.clone().json()).toMatchObject({
      signedIn: true,
      kind: 'demo',
    });
    expect(
      await (
        await sessions.GET(request('/api/session', cookieToken(demo)))
      ).json(),
    ).toMatchObject({ signedIn: true, kind: 'demo' });
    const created = await sessions.POST(
      request('/api/session', cookieToken(demo), {
        mode: 'create',
        name: 'Shivam',
        recipient: 'Arun',
        timeZone: 'Asia/Kolkata',
      }),
    );
    expect(created.status).toBe(201);
    expect(await created.clone().json()).toMatchObject({
      signedIn: true,
      kind: 'owner',
    });
    expect(
      (await requirePrincipal(request('/mcp', cookieToken(created)), true))
        .identity,
    ).toBe('firebase-owner');
    const repeated = await sessions.POST(
      request('/api/session', cookieToken(created), { mode: 'create' }),
    );
    expect(repeated.status).toBe(200);
    expect((await repeated.json()).circle.id).toBe(
      (await created.json()).circle.id,
    );
  });

  it('requires recent Firebase authentication and rejects caller identity headers', async () => {
    vi.spyOn(firebase, 'firebaseAuth').mockReturnValue({
      verifyIdToken: vi.fn().mockResolvedValue({
        uid: 'old-login',
        auth_time: Math.floor(Date.now() / 1000) - 301,
      }),
    } as unknown as ReturnType<typeof firebase.firebaseAuth>);
    const old = await login.POST(
      request('/api/auth', undefined, {
        idToken: 'mock-firebase-id-token-for-test',
      }),
    );
    expect(old.status).toBe(401);
    expect(await old.json()).toMatchObject({
      error: { code: 'RECENT_LOGIN_REQUIRED' },
    });
    const forged = await sessions.POST(
      request(
        '/api/session',
        undefined,
        { mode: 'create', name: 'Fake', recipient: 'Arun', timeZone: 'UTC' },
        {
          'oai-authenticated-user-id': 'forged',
          'oai-authenticated-user-email': 'fake@example.test',
        },
      ),
    );
    expect(forged.status).toBe(401);
    expect((await database().collection('circles').get()).empty).toBe(true);
  });

  it('stores only token hashes and removes circle data and ownership on deletion', async () => {
    const f = await owner();
    const h = await helper(f);
    const mcp = await rotateMcpToken(f.p);
    expect((await sessionRef(f.token).get()).exists).toBe(false);
    expect(
      (await sessionRef(await hashToken(f.token)).get()).get('token'),
    ).toBeUndefined();
    await deleteCircle(f.p);
    expect((await circleRef(f.circle.id).get()).exists).toBe(false);
    expect((await ownerRef(f.user.uid).get()).exists).toBe(false);
    await expect(
      requirePrincipal(request('/mcp', h.token), true),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    await expect(
      requirePrincipal(
        request('/mcp', undefined, undefined, {
          authorization: `Bearer ${mcp.token}`,
        }),
        true,
      ),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('cannot resurrect an owner cookie after logout races with reissuance', async () => {
    const f = await owner();
    const original = persistence.findOwnedCircle;
    let lookups = 0;
    let pauseReached!: () => void;
    let resume!: () => void;
    const paused = new Promise<void>((resolve) => {
      pauseReached = resolve;
    });
    const continuation = new Promise<void>((resolve) => {
      resume = resolve;
    });
    const spy = vi
      .spyOn(persistence, 'findOwnedCircle')
      .mockImplementation(async (uid) => {
        if (++lookups === 2) {
          pauseReached();
          await continuation;
        }
        return original(uid);
      });
    const inflight = sessions.POST(
      request('/api/session', f.token, { mode: 'create' }),
    );
    await paused;
    const logout = await sessions.DELETE(
      new Request(origin + '/api/session', {
        method: 'DELETE',
        headers: { origin, cookie: `${COOKIE}=${f.token}` },
      }),
    );
    expect(logout.status).toBe(200);
    expect((await sessionRef(await hashToken(f.token)).get()).exists).toBe(
      false,
    );
    resume();
    const result = await inflight;
    spy.mockRestore();
    expect(result.status).toBe(401);
    expect(await result.json()).toMatchObject({
      error: { code: 'UNAUTHORIZED' },
    });
    expect(result.headers.get('set-cookie')).toBeNull();
    expect(
      (
        await database()
          .collection('sessions')
          .where('kind', '==', 'owner')
          .get()
      ).empty,
    ).toBe(true);
  });

  it('consumes a parent cookie once under concurrent owner-session reissuance', async () => {
    const f = await owner();
    const responses = await Promise.all([
      sessions.POST(request('/api/session', f.token, { mode: 'create' })),
      sessions.POST(request('/api/session', f.token, { mode: 'create' })),
    ]);
    expect(responses.map((r) => r.status).sort((a, b) => a - b)).toEqual([
      200, 401,
    ]);
    const success = responses.find((r) => r.status === 200)!;
    expect(
      (await requirePrincipal(request('/mcp', cookieToken(success)), true))
        .circleId,
    ).toBe(f.circle.id);
    expect((await sessionRef(await hashToken(f.token)).get()).exists).toBe(
      false,
    );
    expect(
      (
        await database()
          .collection('sessions')
          .where('kind', '==', 'owner')
          .get()
      ).size,
    ).toBe(1);
  });
});
