import { json, status } from '@rental/testing';
import { APARTMENT_ID, captureStderr, connect, TARIFF_ID } from '../test/mcp-client.js';

const attachment = {
  id: 'at-1',
  activeFrom: '2026-01',
  activeTo: '2026-06',
  isCurrent: false,
  tariff: {
    id: TARIFF_ID,
    name: 'Електроенергія',
    kind: 'METERED',
    utilities: ['ELECTRICITY'],
    notes: 'tariff note',
    isActive: true,
    inUse: true,
    apartmentCount: 2,
    currentPrices: [
      { id: 'p-1', effectiveFrom: '2026-01', zone: 'DAY', price: '4.3200', createdAt: 'x' },
      { id: 'p-2', effectiveFrom: '2026-01', zone: 'NIGHT', price: '2.1600', createdAt: 'x' },
    ],
    createdAt: 'x',
    updatedAt: 'x',
  },
};

describe('get_tariffs', () => {
  it('returns tariffs with prices as the API sends them; includeEnded → scope=all', async () => {
    const { call } = await connect({
      [`GET /apartments/${APARTMENT_ID}/tariffs?scope=all`]: json([attachment]),
    });
    const result = await call('get_tariffs', { apartmentId: APARTMENT_ID, includeEnded: true });
    expect(result.structuredContent).toEqual({
      tariffs: [
        {
          tariffId: TARIFF_ID,
          name: 'Електроенергія',
          kind: 'METERED',
          utilities: ['ELECTRICITY'],
          activeFrom: '2026-01',
          activeTo: '2026-06',
          prices: [
            { zone: 'DAY', price: '4.3200', effectiveFrom: '2026-01' },
            { zone: 'NIGHT', price: '2.1600', effectiveFrom: '2026-01' },
          ],
        },
      ],
    });
    expect(JSON.stringify(result)).not.toContain('tariff note');
  });

  it('reports an API error', async () => {
    captureStderr();
    const { call } = await connect({
      [`GET /apartments/${APARTMENT_ID}/tariffs?scope=current`]: status(404, {
        message: 'Apartment not found',
      }),
    });
    const result = await call('get_tariffs', { apartmentId: APARTMENT_ID });
    expect(result).toMatchObject({
      isError: true,
      content: [{ text: 'get_tariffs failed: API responded 404: Apartment not found' }],
    });
  });
});
