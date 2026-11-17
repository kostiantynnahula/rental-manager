import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { fakeApi, type Routes } from '@rental/testing';
import type { paths } from '../api/schema.js';
import { createServer } from '../server.js';

// The real MCP server and an SDK client, linked in memory; the API side is fakeApi (the real openapi-fetch client).
export async function connect(routes: Routes) {
  const { api, requests } = fakeApi<paths>(routes);
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'test', version: '0' });
  await Promise.all([createServer(api).connect(serverTransport), client.connect(clientTransport)]);
  onTestFinished(() => client.close());

  const call = async (name: string, args: Record<string, unknown> = {}) =>
    (await client.callTool({ name, arguments: args })) as CallToolResult;
  return { client, requests, call };
}

// Mutes stderr (apiError logs there) and returns everything written to it.
export function captureStderr(): () => string {
  const spy = vi.spyOn(process.stderr, 'write').mockReturnValue(true);
  return () => spy.mock.calls.map(([chunk]) => String(chunk)).join('');
}

export const APARTMENT_ID = '11111111-1111-4111-8111-111111111111';
export const METER_ID = '22222222-2222-4222-8222-222222222222';
export const TARIFF_ID = '33333333-3333-4333-8333-333333333333';
export const STATEMENT_ID = '44444444-4444-4444-8444-444444444444';
