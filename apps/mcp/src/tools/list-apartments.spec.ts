import { json, status } from '@rental/testing';
import { captureStderr, connect } from '../test/mcp-client.js';

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
    const { call } = await connect({ 'GET /apartments?active=true': json([apartment]) });
    const result = await call('list_apartments');

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
    const { call, requests } = await connect({
      'GET /apartments?active=all': json([apartment, archived]),
    });
    const result = await call('list_apartments', { includeArchived: true });
    expect(requests.map((r) => r.url)).toEqual(['/apartments?active=all']);
    expect(result.structuredContent).toMatchObject({
      apartments: [{ isActive: true }, { id: 'apt-2', isActive: false }],
    });
  });

  it('reports a server error as a tool error with the status only', async () => {
    const stderr = captureStderr();
    const { call } = await connect({
      'GET /apartments?active=true': status(500, { message: 'secret detail' }),
    });
    const result = await call('list_apartments');
    expect(result.isError).toBe(true);
    expect(result.content).toEqual([
      { type: 'text', text: 'list_apartments failed: API responded 500' },
    ]);
    expect(stderr()).toBe('[rental-mcp] list_apartments: API responded 500\n');
  });
});
