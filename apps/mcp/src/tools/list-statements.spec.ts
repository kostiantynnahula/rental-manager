import { json, status } from '@rental/testing';
import { APARTMENT_ID, captureStderr, connect, STATEMENT_ID } from '../test/mcp-client.js';

const BASE = `GET /apartments/${APARTMENT_ID}/statements`;
const item = (period: string) => ({
  id: `${STATEMENT_ID.slice(0, -2)}${period.slice(-2)}`,
  period,
  status: 'ISSUED',
  totalAmount: 1586400,
  warningsCount: 0,
  issuedAt: `${period}-30T10:00:00.000Z`,
});
const page = (periods: string[], total: number, n = 1) =>
  json({ items: periods.map(item), total, page: n, pageSize: 50 });

describe('list_statements', () => {
  it('returns totals in UAH', async () => {
    const { call } = await connect({ [`${BASE}?page=1&pageSize=50`]: page(['2026-10'], 1) });
    const result = await call('list_statements', { apartmentId: APARTMENT_ID });
    expect(result.structuredContent).toEqual({
      statements: [
        {
          id: item('2026-10').id,
          period: '2026-10',
          status: 'ISSUED',
          total: '15864.00',
          warningsCount: 0,
          issuedAt: '2026-10-30T10:00:00.000Z',
        },
      ],
      truncated: false,
    });
  });

  it('filters a range and stops walking pages once past `from`', async () => {
    const { call, requests } = await connect({
      [`${BASE}?page=1&pageSize=50`]: page(['2026-11', '2026-10', '2026-09', '2026-08'], 4),
    });
    const result = await call('list_statements', {
      apartmentId: APARTMENT_ID,
      from: '2026-09',
      to: '2026-10',
    });
    expect(requests).toHaveLength(1);
    expect(result.structuredContent).toMatchObject({
      statements: [{ period: '2026-10' }, { period: '2026-09' }],
      truncated: false,
    });
  });

  it('asks the API for one month when from = to', async () => {
    const { call } = await connect({
      [`${BASE}?period=2026-10&page=1&pageSize=50`]: page(['2026-10'], 1),
    });
    const result = await call('list_statements', {
      apartmentId: APARTMENT_ID,
      from: '2026-10',
      to: '2026-10',
    });
    expect(result.structuredContent).toMatchObject({ statements: [{ period: '2026-10' }] });
  });

  it('reports an API error', async () => {
    captureStderr();
    const { call } = await connect({ [`${BASE}?page=1&pageSize=50`]: status(500) });
    const result = await call('list_statements', { apartmentId: APARTMENT_ID });
    expect(result.isError).toBe(true);
  });
});
