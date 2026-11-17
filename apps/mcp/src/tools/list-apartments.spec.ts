import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { fakeApi, json, status, type Routes } from '@rental/testing';
import type { paths } from '../api/schema.js';
import { createServer } from '../server.js';

const apartment = {
  id: 'apt-1',
  name: 'Kyiv, Khreshchatyk 1',
  address: 'Khreshchatyk St 1, apt 5',
  notes: 'private note',
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  currentLease: { id: 'lease-1', monthlyRent: 1500000, tenants: [] },
};

// The real MCP server and client, linked in memory; the API side is fakeApi (the real openapi-fetch client).
async function connect(routes: Routes) {
  const { api, requests } = fakeApi<paths>(routes);
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'test', version: '0' });
  await Promise.all([createServer(api).connect(serverTransport), client.connect(clientTransport)]);
  onTestFinished(() => client.close());
  return { client, requests };
}

describe('list_apartments', () => {
  it('is listed with its input and output schemas', async () => {
    const { client } = await connect({});
    const { tools } = await client.listTools();
    const tool = tools.find((t) => t.name === 'list_apartments');
    expect(tool?.inputSchema.properties).toHaveProperty('includeArchived');
    expect(tool?.outputSchema?.properties).toHaveProperty('apartments');
    expect(tool?.annotations?.readOnlyHint).toBe(true);
  });

  it('returns only the allowlisted fields of active apartments', async () => {
    const { client } = await connect({ 'GET /apartments?active=true': json([apartment]) });
    const result = await client.callTool({ name: 'list_apartments', arguments: {} });

    const expected = {
      apartments: [
        {
          id: 'apt-1',
          name: 'Kyiv, Khreshchatyk 1',
          address: 'Khreshchatyk St 1, apt 5',
          isActive: true,
        },
      ],
    };
    expect(result.isError).toBeFalsy();
    expect(result.structuredContent).toEqual(expected);
    expect(result.content).toEqual([{ type: 'text', text: JSON.stringify(expected) }]);
  });

  it('includes archived apartments on request', async () => {
    const archived = { ...apartment, id: 'apt-2', isActive: false };
    const { client, requests } = await connect({
      'GET /apartments?active=all': json([apartment, archived]),
    });
    const result = await client.callTool({
      name: 'list_apartments',
      arguments: { includeArchived: true },
    });
    expect(requests.map((r) => r.url)).toEqual(['/apartments?active=all']);
    expect(result.structuredContent).toMatchObject({
      apartments: [{ isActive: true }, { id: 'apt-2', isActive: false }],
    });
  });

  it('reports an API error as a tool error, without the response body', async () => {
    const stderr = vi.spyOn(process.stderr, 'write').mockReturnValue(true);
    const { client } = await connect({
      'GET /apartments?active=true': status(500, { message: 'secret detail' }),
    });
    const result = await client.callTool({ name: 'list_apartments', arguments: {} });
    expect(result.isError).toBe(true);
    expect(result.content).toEqual([
      { type: 'text', text: 'list_apartments failed: API responded 500' },
    ]);
    expect(stderr).toHaveBeenCalledWith('[rental-mcp] list_apartments: API responded 500\n');
    expect(JSON.stringify(stderr.mock.calls)).not.toContain('secret detail');
  });
});
