import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
const base = process.env.BASE_URL ?? 'http://localhost:3001';
let checks = 0;
async function api(path, method = 'GET', data, session, expected = 200) {
  const response = await fetch(base + path, {
    method,
    headers: {
      Origin: base,
      'Content-Type': 'application/json',
      ...(session ? { Cookie: session } : {}),
    },
    ...(data ? { body: JSON.stringify(data) } : {}),
  });
  const result = await response.json();
  assert.equal(response.status, expected, JSON.stringify(result));
  return {
    data: result,
    cookie: response.headers.get('set-cookie')?.split(';')[0],
  };
}
const owner = await api('/api/session', 'POST', { mode: 'demo' }, null, 201);
let c = owner.data.circle;
async function tool(session, name, args = {}, error, extra = {}) {
  const client = new Client({
    name: 'kindhandoff-multi-user-proof',
    version: '1.0.0',
  });
  const transport = new StreamableHTTPClientTransport(new URL(base + '/mcp'), {
    requestInit: { headers: { Origin: base, Cookie: session, ...extra } },
  });
  try {
    await client.connect(transport);
    assert.equal(transport.protocolVersion, '2025-11-25');
    const r = await client.callTool({ name, arguments: args });
    const d = r.structuredContent ?? JSON.parse(r.content[0].text);
    if (error) {
      assert.equal(d.error?.code, error, JSON.stringify(d));
    } else {
      assert.equal(r.isError, undefined, JSON.stringify(d));
      if (d.circle) c = d.circle;
    }
    return d;
  } finally {
    await client.close();
  }
}
const write = (args = {}) => ({
  ...args,
  expectedVersion: c.version,
  requestId: crypto.randomUUID(),
});
await tool(
  owner.cookie,
  'report_unavailable',
  write({
    memberId: 'maya',
    from: c.tasks[1].start,
    to: c.tasks[2].end,
    reason: 'Work shift changed.',
  }),
);
await tool(owner.cookie, 'propose_recovery', write());
const inviteJo = await api(
  '/api/invite',
  'POST',
  { memberId: 'jo' },
  owner.cookie,
);
const inviteDev = await api(
  '/api/invite',
  'POST',
  { memberId: 'dev' },
  owner.cookie,
);
const joToken = new URL(inviteJo.data.url).hash.slice(1);
const devToken = new URL(inviteDev.data.url).hash.slice(1);
const jo = await api('/api/join', 'POST', { token: joToken });
const dev = await api('/api/join', 'POST', { token: devToken });
checks++;
await api('/api/join', 'POST', { token: joToken }, null, 410);
checks++;
await tool(
  jo.cookie,
  'respond_to_handoff',
  write({ taskId: 'ride', response: 'accept' }),
  'FORBIDDEN',
  { 'x-dayweave-demo-member': 'dev' },
);
checks++;
await tool(
  jo.cookie,
  'respond_to_handoff',
  write({ taskId: 'bag', response: 'accept' }),
);
await tool(
  dev.cookie,
  'respond_to_handoff',
  write({ taskId: 'ride', response: 'accept' }),
);
checks++;
await tool(
  dev.cookie,
  'complete_commitment',
  write({ taskId: 'ride' }),
  'DEPENDENCY',
);
await tool(jo.cookie, 'complete_commitment', write({ taskId: 'bag' }));
await tool(dev.cookie, 'complete_commitment', write({ taskId: 'ride' }));
checks++;
const b1 = await tool(jo.cookie, 'get_handoff_brief');
await tool(jo.cookie, 'acknowledge_brief', write({ briefVersion: b1.version }));
const b2 = await tool(dev.cookie, 'get_handoff_brief');
assert.equal(b2.version, b1.version);
await tool(
  dev.cookie,
  'acknowledge_brief',
  write({ briefVersion: b2.version }),
);
assert.equal(c.acknowledgments.length, 2);
assert.equal(new Set(c.acknowledgments.map((a) => a.version)).size, 1);
checks++;
await tool(
  owner.cookie,
  'add_note',
  write({ text: 'The library bag is home again.' }),
);
await tool(
  jo.cookie,
  'acknowledge_brief',
  write({ briefVersion: b1.version }),
  'STALE_BRIEF',
);
checks++;
const stranger = await api('/api/session', 'POST', { mode: 'demo' }, null, 201);
const foreign = await tool(stranger.cookie, 'get_day');
assert.notEqual(foreign.circle.id, owner.data.circle.id);
assert.equal(
  foreign.circle.notes.some((n) => n.text === 'The library bag is home again.'),
  false,
);
checks++;
const ownRead = await tool(jo.cookie, 'get_day');
assert.equal(ownRead.circle.id, owner.data.circle.id);
await api('/api/invite', 'POST', { memberId: 'dev' }, jo.cookie, 403);
checks++;
const issued = await api('/api/token', 'POST', undefined, owner.cookie);
const bearer = issued.data.token;
for (const path of ['/api/token', '/api/invite', '/api/account']) {
  const r = await fetch(base + path, {
    method: path === '/api/account' ? 'DELETE' : 'POST',
    headers: {
      Authorization: `Bearer ${bearer}`,
      Origin: base,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ memberId: 'jo', confirmation: 'DELETE' }),
  });
  assert.equal(r.status, 403);
}
await api('/api/token', 'POST', undefined, `dayweave_session=${bearer}`, 403);
checks++;
const tokens = await Promise.all([
  api('/api/token', 'POST', undefined, owner.cookie),
  api('/api/token', 'POST', undefined, owner.cookie),
]);
const valid = await Promise.all(
  tokens.map(async (r) => {
    const response = await fetch(base + '/mcp', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${r.data.token}`,
        Origin: base,
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-11-25',
          capabilities: {},
          clientInfo: { name: 'token-test', version: '1' },
        },
      }),
    });
    return response.status;
  }),
);
assert.deepEqual(
  valid.sort((a, b) => a - b),
  [200, 401],
);
checks++;
await api('/api/invite', 'DELETE', { memberId: 'jo' }, owner.cookie);
const revoked = await fetch(base + '/mcp', {
  method: 'POST',
  headers: {
    Cookie: jo.cookie,
    Origin: base,
    'Content-Type': 'application/json',
  },
  body: '{}',
});
assert.equal(revoked.status, 401);
checks++;
const after = await api('/api/session', 'GET', undefined, dev.cookie);
assert.equal(
  after.data.circle.tasks.every((t) => t.status === 'done'),
  true,
);
checks++;
console.log(
  JSON.stringify(
    {
      ok: true,
      independentSessions: 4,
      checks,
      protocol: '2025-11-25',
      transport: 'Streamable HTTP',
      evidence: [
        'one-time real invitation redemption',
        'helper cannot impersonate demo roles',
        'individual acceptance',
        'dependency blocking and completion',
        'two helpers acknowledge same content revision',
        'substantive changes stale the brief',
        'tenant isolation',
        'helper admin denial',
        'MCP administrative scope restriction',
        'atomic token rotation',
        'helper session revocation',
        'persistent completed plan',
      ],
    },
    null,
    2,
  ),
);
