import { json, status } from '@rental/testing';
import { MAX_PAGES } from '../helpers/pages.js';
import { APARTMENT_ID, captureStderr, connect, METER_ID } from '../test/mcp-client.js';

const BASE = `GET /apartments/${APARTMENT_ID}/readings/history`;
const item = (period: string) => ({
  id: `r-${period}`,
  meter: { id: METER_ID, utility: 'GAS', label: null, serialNumber: 'G-1', removed: false },
  period,
  readingDate: `${period}-28`,
  kind: 'REGULAR',
  values: [
    {
      zone: 'TOTAL',
      value: '1520.350',
      consumption: '42.100',
      source: 'PHOTO',
      photoId: 'photo-1',
      warnings: [],
    },
  ],
});

describe('get_reading_history', () => {
  it('passes the range and meters on and returns the allowlisted readings', async () => {
    const { call, requests } = await connect({
      [`${BASE}?from=2026-06&to=2026-11&meterIds=${METER_ID}&page=1&pageSize=50`]: json({
        items: [item('2026-11')],
        total: 1,
        page: 1,
        pageSize: 50,
      }),
    });
    const result = await call('get_reading_history', {
      apartmentId: APARTMENT_ID,
      from: '2026-06',
      to: '2026-11',
      meterIds: [METER_ID],
    });

    expect(requests).toHaveLength(1);
    expect(result.structuredContent).toEqual({
      items: [
        {
          meter: { id: METER_ID, utility: 'GAS', label: null, serialNumber: 'G-1', removed: false },
          period: '2026-11',
          readingDate: '2026-11-28',
          kind: 'REGULAR',
          values: [{ zone: 'TOTAL', value: '1520.350', consumption: '42.100', warnings: [] }],
        },
      ],
      total: 1,
      truncated: false,
    });
    expect(JSON.stringify(result)).not.toContain('photo-1');
  });

  it('for a utility, asks for all its meters, the replaced one included', async () => {
    const OLD = '55555555-5555-4555-8555-555555555555';
    const meters = [
      { id: METER_ID, utility: 'GAS', removedAt: null },
      { id: OLD, utility: 'GAS', removedAt: '2026-08-15' },
      { id: 'm-el', utility: 'ELECTRICITY', removedAt: null },
    ];
    const { call, requests } = await connect({
      [`GET /apartments/${APARTMENT_ID}/meters?includeRemoved=true`]: json(meters),
      [`${BASE}?from=2026-06&meterIds=${METER_ID}&meterIds=${OLD}&page=1&pageSize=50`]: json({
        items: [item('2026-11')],
        total: 1,
        page: 1,
        pageSize: 50,
      }),
    });
    const result = await call('get_reading_history', {
      apartmentId: APARTMENT_ID,
      from: '2026-06',
      utility: 'GAS',
    });
    expect(requests).toHaveLength(2);
    expect(result.structuredContent).toMatchObject({ total: 1, truncated: false });
  });

  it('returns nothing without asking for history when the utility has no meters', async () => {
    const { call, requests } = await connect({
      [`GET /apartments/${APARTMENT_ID}/meters?includeRemoved=true`]: json([
        { id: METER_ID, utility: 'GAS', removedAt: null },
      ]),
    });
    const result = await call('get_reading_history', {
      apartmentId: APARTMENT_ID,
      utility: 'HOT_WATER',
    });
    expect(requests).toHaveLength(1);
    expect(result.structuredContent).toEqual({ items: [], total: 0, truncated: false });
  });

  it('rejects more meter ids than the API accepts', async () => {
    const { call, requests } = await connect({});
    const result = await call('get_reading_history', {
      apartmentId: APARTMENT_ID,
      meterIds: Array.from({ length: 51 }, () => METER_ID),
    });
    expect(result.isError).toBe(true);
    expect(requests).toEqual([]);
  });

  it(`walks pages and stops after ${MAX_PAGES}, saying it was truncated`, async () => {
    const page = (n: number) =>
      json({ items: [item(`page-${n}`)], total: 1000, page: n, pageSize: 50 });
    const routes = Object.fromEntries(
      Array.from({ length: MAX_PAGES }, (_, i) => [
        `${BASE}?page=${i + 1}&pageSize=50`,
        page(i + 1),
      ]),
    );
    const { call, requests } = await connect(routes);
    const result = await call('get_reading_history', { apartmentId: APARTMENT_ID });

    expect(requests).toHaveLength(MAX_PAGES);
    expect(result.structuredContent).toMatchObject({ total: 1000, truncated: true });
  });

  it('fails as a whole when a page fails', async () => {
    captureStderr();
    const { call } = await connect({
      [`${BASE}?page=1&pageSize=50`]: json({
        items: [item('2026-11')],
        total: 60,
        page: 1,
        pageSize: 50,
      }),
      [`${BASE}?page=2&pageSize=50`]: status(500),
    });
    const result = await call('get_reading_history', { apartmentId: APARTMENT_ID });
    expect(result).toMatchObject({
      isError: true,
      content: [{ text: 'get_reading_history failed: API responded 500' }],
    });
  });
});
