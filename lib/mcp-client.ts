'use client';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { CallToolResultSchema } from '@modelcontextprotocol/sdk/types.js';
import type { ToolName, ToolResults } from './server/tools';
import { isRecord, responseError } from './api-client';
export type Trace = {
  id: string;
  tool: string;
  at: string;
  duration: number;
  ok: boolean;
  protocol: string;
  detail: string;
};
export async function callMcp<N extends ToolName>(
  name: N,
  args: Record<string, unknown>,
  demoMember: string | undefined,
  onTrace?: (t: Trace) => void,
): Promise<ToolResults[N]> {
  const start = performance.now();
  const client = new Client({
    name: 'kindhandoff-web-simulator',
    version: '1.0.0',
  });
  const headers: Record<string, string> = {};
  if (demoMember) headers['x-dayweave-demo-member'] = demoMember;
  const transport = new StreamableHTTPClientTransport(
    new URL('/mcp', window.location.origin),
    { requestInit: { headers, credentials: 'same-origin' } },
  );
  try {
    await client.connect(transport);
    const result = CallToolResultSchema.parse(
      await client.callTool({ name, arguments: args }),
    );
    const text = result.content.find((entry) => entry.type === 'text');
    const value: unknown =
      result.structuredContent ?? JSON.parse(text?.text ?? '{}');
    if (!isRecord(value))
      throw new Error('The MCP server returned an invalid response.');
    if (result.isError)
      throw new Error(
        `${isRecord(value.error) && typeof value.error.code === 'string' ? value.error.code : 'ERROR'}: ${responseError(value) ?? 'The action could not be completed.'}`,
      );
    onTrace?.({
      id: crypto.randomUUID(),
      tool: name,
      at: new Date().toISOString(),
      duration: Math.round(performance.now() - start),
      ok: true,
      protocol: transport.protocolVersion ?? '2025-11-25',
      detail: 'Live MCP request completed',
    });
    // Tools use the shared server contract after the SDK validates the envelope.
    return value as ToolResults[N];
  } catch (e) {
    onTrace?.({
      id: crypto.randomUUID(),
      tool: name,
      at: new Date().toISOString(),
      duration: Math.round(performance.now() - start),
      ok: false,
      protocol: transport.protocolVersion ?? '2025-11-25',
      detail: e instanceof Error ? e.message : 'Request failed',
    });
    throw e;
  } finally {
    await client.close();
  }
}
