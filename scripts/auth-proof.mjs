import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const base = process.env.BASE_URL ?? 'http://127.0.0.1:3001';
const emulator = process.env.FIREBASE_AUTH_EMULATOR_HOST;
if (!emulator && process.env.ALLOW_LIVE_AUTH_TEST !== '1')
  throw new Error(
    'Use the Auth emulator, or explicitly allow a fresh live synthetic account.',
  );
const config = emulator
  ? { apiKey: 'demo-key' }
  : await (await fetch(base + '/__/firebase/init.json')).json();
const authOrigin = emulator
  ? `http://${emulator}/identitytoolkit.googleapis.com`
  : 'https://identitytoolkit.googleapis.com';
const email = `kindhandoff-test-${randomUUID()}@example.invalid`;
const password = randomBytes(28).toString('base64url') + 'Aa9!';
let idToken;
let session;
let circleId;
let checks = 0;
async function firebase(action, body) {
  const r = await fetch(
    `${authOrigin}/v1/accounts:${action}?key=${encodeURIComponent(config.apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );
  const d = await r.json();
  assert.equal(r.status, 200, d.error?.message ?? 'Firebase request failed');
  return d;
}
async function api(
  path,
  method = 'GET',
  data,
  expected = 200,
  auth = session,
  extra = {},
) {
  const r = await fetch(base + path, {
    method,
    headers: {
      Origin: base,
      'Content-Type': 'application/json',
      ...(auth ? { Cookie: auth } : {}),
      ...extra,
    },
    ...(data ? { body: JSON.stringify(data) } : {}),
  });
  const d = await r.json();
  assert.equal(r.status, expected, JSON.stringify(d));
  return { data: d, cookie: r.headers.get('set-cookie') };
}
try {
  await api(
    '/api/session',
    'POST',
    { mode: 'create', name: 'Forged', recipient: 'Test', timeZone: 'UTC' },
    401,
    undefined,
    {
      'oai-authenticated-user-id': 'forged',
      'oai-authenticated-user-email': 'forged@example.invalid',
    },
  );
  checks++;
  await api(
    '/api/auth',
    'POST',
    { idToken: 'invalid-token.invalid-token.invalid-token' },
    401,
  );
  checks++;
  idToken = (
    await firebase('signUp', { email, password, returnSecureToken: true })
  ).idToken;
  const exchange = await api('/api/auth', 'POST', { idToken });
  assert.equal(exchange.data.ok, true);
  assert.match(exchange.cookie, /^__session=/);
  assert.match(exchange.cookie, /HttpOnly/);
  assert.match(exchange.cookie, /SameSite=Lax/);
  if (base.startsWith('https:')) assert.match(exchange.cookie, /Secure/);
  session = exchange.cookie.split(';')[0];
  checks++;
  const before = await api('/api/session');
  assert.equal(before.data.signedIn, true);
  assert.equal(before.data.circle, null);
  checks++;
  const created = await api(
    '/api/session',
    'POST',
    {
      mode: 'create',
      name: 'Lena test',
      recipient: 'Synthetic household',
      timeZone: 'Asia/Kolkata',
    },
    201,
  );
  circleId = created.data.circle.id;
  if (created.cookie) session = created.cookie.split(';')[0];
  assert.equal(created.data.circle.demo, false);
  assert.equal(created.data.circle.tasks.length, 0);
  assert.equal(created.data.circle.members.length, 1);
  checks++;
  const same = await api('/api/session', 'POST', {
    mode: 'create',
    name: 'Lena test',
    recipient: 'Synthetic household',
    timeZone: 'Asia/Kolkata',
  });
  assert.equal(same.data.circle.id, circleId);
  if (same.cookie) session = same.cookie.split(';')[0];
  checks++;
  const client = new Client({
    name: 'kindhandoff-owner-proof',
    version: '1.0.0',
  });
  try {
    const transport = new StreamableHTTPClientTransport(
      new URL(base + '/mcp'),
      { requestInit: { headers: { Origin: base, Cookie: session } } },
    );
    await client.connect(transport);
    const result = await client.callTool({ name: 'get_day', arguments: {} });
    const value =
      result.structuredContent ?? JSON.parse(result.content[0].text);
    assert.equal(value.circle.id, circleId);
    assert.equal(value.memberId, 'owner');
    checks++;
  } finally {
    await client.close();
  }
  const exported = await api('/api/export');
  assert.equal(exported.data.circle.id, circleId);
  checks++;
  await api('/api/session', 'DELETE');
  const out = await api('/api/session');
  assert.equal(out.data.signedIn, false);
  checks++;
  idToken = (
    await firebase('signInWithPassword', {
      email,
      password,
      returnSecureToken: true,
    })
  ).idToken;
  const again = await api('/api/auth', 'POST', { idToken }, 200, undefined);
  session = again.cookie.split(';')[0];
  const restored = await api('/api/session');
  assert.equal(restored.data.circle.id, circleId);
  checks++;
  await api('/api/account', 'DELETE', { confirmation: 'no' }, 400);
  await api('/api/account', 'DELETE', { confirmation: 'DELETE' });
  circleId = undefined;
  checks++;
  console.log(
    JSON.stringify(
      {
        ok: true,
        checks,
        environment: emulator ? 'Firebase emulators' : 'Firebase production',
        evidence: [
          'forged identity headers rejected',
          'invalid Firebase token rejected',
          'verified token exchange and secure cookie',
          'signed-in identity before circle creation',
          'blank personal circle',
          'one circle per coordinator',
          'owner MCP identity',
          'export',
          'logout revocation',
          'sign-in restores persisted circle',
          'confirmed deletion',
        ],
      },
      null,
      2,
    ),
  );
} finally {
  if (circleId && session)
    await api('/api/account', 'DELETE', { confirmation: 'DELETE' }).catch(
      () => {},
    );
  if (idToken) await firebase('delete', { idToken });
}
