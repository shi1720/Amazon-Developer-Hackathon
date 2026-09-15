import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
const base = process.env.BASE_URL ?? 'http://localhost:3001';
const r = await fetch(base + '/api/session', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Origin: base },
  body: JSON.stringify({ mode: 'demo' }),
});
assert.equal(r.status, 201, await r.clone().text());
const session = await r.json();
const cookie = r.headers.get('set-cookie').split(';')[0];
let c = session.circle;
let calls = 0;
const latencies = [];
async function tool(name, args = {}, actor = 'maya', expectedError) {
  const client = new Client({
    name: 'kindhandoff-acceptance-tests',
    version: '1.0.0',
  });
  const transport = new StreamableHTTPClientTransport(new URL(base + '/mcp'), {
    requestInit: {
      headers: {
        Cookie: cookie,
        Origin: base,
        'x-dayweave-demo-member': actor,
      },
    },
  });
  const start = performance.now();
  try {
    await client.connect(transport);
    assert.equal(transport.protocolVersion, '2025-11-25');
    const result = await client.callTool({ name, arguments: args });
    const data = result.structuredContent ?? JSON.parse(result.content[0].text);
    if (expectedError) {
      assert.equal(data.error?.code, expectedError, JSON.stringify(data));
      assert.equal(result.isError, true);
    } else {
      assert.equal(result.isError, undefined, JSON.stringify(data));
      if (data.circle) c = data.circle;
    }
    calls++;
    latencies.push(Math.round(performance.now() - start));
    return data;
  } finally {
    await client.close();
  }
}
const write = (args = {}) => ({
  ...args,
  expectedVersion: c.version,
  requestId: crypto.randomUUID(),
});
await tool('get_day');
assert.equal(c.tasks.filter((t) => t.status === 'accepted').length, 2);
const disruption = write({
  memberId: 'maya',
  from: c.tasks[1].start,
  to: c.tasks[2].end,
  reason: 'My work shift changed.',
});
await tool('report_unavailable', disruption);
assert.equal(c.tasks.filter((t) => t.status === 'blocked').length, 2);
await tool('report_unavailable', disruption);
assert.equal(c.version, 1, 'retry does not create another version');
await tool(
  'report_unavailable',
  { ...disruption, reason: 'Changed payload' },
  'maya',
  'IDEMPOTENCY_CONFLICT',
);
const preview = await tool('preview_recovery');
assert.deepEqual(
  preview.plan.assignments.map((x) => [x.taskId, x.candidateId]),
  [
    ['bag', 'jo'],
    ['ride', 'dev'],
  ],
);
await tool('propose_recovery', write());
assert.equal(c.tasks.filter((t) => t.status === 'offered').length, 2);
assert.equal(
  c.tasks.filter((t) => t.status === 'accepted').length,
  0,
  'offers are not accepted',
);
await tool(
  'respond_to_handoff',
  write({ taskId: 'bag', response: 'accept' }),
  'maya',
  'FORBIDDEN',
);
await tool(
  'respond_to_handoff',
  write({ taskId: 'bag', response: 'accept' }),
  'jo',
);
await tool(
  'respond_to_handoff',
  write({ taskId: 'ride', response: 'accept' }),
  'dev',
);
await tool(
  'complete_commitment',
  write({ taskId: 'ride' }),
  'dev',
  'DEPENDENCY',
);
await tool('complete_commitment', write({ taskId: 'bag' }), 'jo');
await tool('complete_commitment', write({ taskId: 'ride' }), 'dev');
const b = await tool('get_handoff_brief');
assert.equal(b.unclaimed.length, 0);
await tool(
  'acknowledge_brief',
  write({ briefVersion: c.contentVersion }),
  'dev',
);
await tool(
  'add_note',
  {
    expectedVersion: 0,
    requestId: crypto.randomUUID(),
    text: 'Should be rejected',
  },
  'maya',
  'STALE_VERSION',
);
const read = await fetch(base + '/api/session', {
  headers: { Cookie: cookie },
});
const saved = await read.json();
assert.equal(saved.circle.version, c.version);
assert.equal(
  saved.circle.tasks.every((t) => t.status === 'done'),
  true,
);
const blocked = await fetch(base + '/mcp', {
  method: 'POST',
  headers: {
    Cookie: cookie,
    Origin: 'https://untrusted.invalid',
    'Content-Type': 'application/json',
  },
  body: '{}',
});
assert.equal(blocked.status, 403);
const unauth = await fetch(base + '/mcp', {
  method: 'POST',
  headers: { Origin: base, 'Content-Type': 'application/json' },
  body: '{}',
});
assert.equal(unauth.status, 401);
latencies.sort((a, b) => a - b);
console.log(
  JSON.stringify(
    {
      ok: true,
      protocol: '2025-11-25',
      transport: 'Streamable HTTP',
      calls,
      revision: c.version,
      latency: {
        medianMs: latencies[Math.floor(latencies.length / 2)],
        p95Ms: latencies[Math.floor(latencies.length * 0.95)],
      },
      checks: [
        'end-to-end recovery',
        'exact actor authorization',
        'dependency gating',
        'same-request retry',
        'idempotency collision',
        'stale revision',
        'persistence',
        'cross-origin rejection',
        'missing auth rejection',
      ],
    },
    null,
    2,
  ),
);
