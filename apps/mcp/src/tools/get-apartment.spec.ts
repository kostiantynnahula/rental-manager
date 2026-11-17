import { json, status } from '@rental/testing';
import { APARTMENT_ID, captureStderr, connect, METER_ID, TARIFF_ID } from '../test/mcp-client.js';

const A = `/apartments/${APARTMENT_ID}`;

const apartment = {
  id: APARTMENT_ID,
  name: 'Kyiv 1',
  address: 'Khreshchatyk St 1',
  notes: 'private note',
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  currentLease: {
    id: 'lease-1',
    monthlyRent: 1500000,
    notes: 'lease note',
    tenants: [
      { tenantId: 't-1', fullName: 'Ivan Petrenko', phone: '+380501112233', role: 'PRIMARY' },
    ],
  },
};
const meter = {
  id: METER_ID,
  apartmentId: APARTMENT_ID,
  utility: 'GAS',
  zoneScheme: 'SINGLE',
  label: null,
  serialNumber: 'G-123',
  installedAt: '2026-01-15',
  removedAt: null,
  notes: 'meter note',
  lastReading: {
    id: 'r-1',
    kind: 'REGULAR',
    period: '2026-10',
    readingDate: '2026-10-28',
    values: [{ zone: 'TOTAL', value: '1520.350' }],
  },
  canDelete: false,
  canEditInitialValues: false,
  createdAt: '2026-01-15T00:00:00.000Z',
  updatedAt: '2026-01-15T00:00:00.000Z',
};
const attachment = {
  id: 'at-1',
  activeFrom: '2026-01',
  activeTo: null,
  isCurrent: true,
  tariff: {
    id: TARIFF_ID,
    name: 'Вивіз сміття',
    kind: 'FIXED',
    utilities: [],
    notes: 'tariff note',
    isActive: true,
    inUse: true,
    apartmentCount: 3,
    currentPrices: [
      { id: 'p-1', effectiveFrom: '2026-01', zone: 'TOTAL', price: '120.0000', createdAt: 'x' },
    ],
    createdAt: 'x',
    updatedAt: 'x',
  },
};

const routes = {
  [`GET ${A}`]: json(apartment),
  [`GET ${A}/meters`]: json([meter]),
  [`GET ${A}/tariffs?scope=current`]: json([attachment]),
};

describe('get_apartment', () => {
  it('is listed as read-only', async () => {
    const { client } = await connect({});
    const tool = (await client.listTools()).tools.find((t) => t.name === 'get_apartment');
    expect(tool?.annotations?.readOnlyHint).toBe(true);
    expect(tool?.inputSchema.required).toEqual(['apartmentId']);
  });

  it('returns the apartment, its meters and tariffs from the allowlist only', async () => {
    const { call } = await connect(routes);
    const result = await call('get_apartment', { apartmentId: APARTMENT_ID });

    expect(result.structuredContent).toEqual({
      apartment: { id: APARTMENT_ID, name: 'Kyiv 1', address: 'Khreshchatyk St 1', isActive: true },
      meters: [
        {
          id: METER_ID,
          utility: 'GAS',
          zoneScheme: 'SINGLE',
          label: null,
          serialNumber: 'G-123',
          installedAt: '2026-01-15',
          lastReading: {
            period: '2026-10',
            readingDate: '2026-10-28',
            values: [{ zone: 'TOTAL', value: '1520.350' }],
          },
        },
      ],
      tariffs: [
        {
          tariffId: TARIFF_ID,
          name: 'Вивіз сміття',
          kind: 'FIXED',
          utilities: [],
          activeFrom: '2026-01',
          activeTo: null,
          prices: [{ zone: 'TOTAL', price: '120.0000', effectiveFrom: '2026-01' }],
        },
      ],
    });
    const text = JSON.stringify(result);
    for (const leaked of ['note', 'Ivan', '+380', 'lease', 'tenant', 'monthlyRent']) {
      expect(text).not.toContain(leaked);
    }
  });

  it('passes the API message of a 404 on', async () => {
    captureStderr();
    const { call } = await connect({
      ...routes,
      [`GET ${A}`]: status(404, { message: 'Apartment not found' }),
    });
    const result = await call('get_apartment', { apartmentId: APARTMENT_ID });
    expect(result.isError).toBe(true);
    expect(result.content).toEqual([
      { type: 'text', text: 'get_apartment failed: API responded 404: Apartment not found' },
    ]);
  });

  it('rejects an id that is not a uuid without calling the API', async () => {
    const { call, requests } = await connect({});
    const result = await call('get_apartment', { apartmentId: 'kyiv' });
    expect(result.isError).toBe(true);
    expect(requests).toEqual([]);
  });
});
