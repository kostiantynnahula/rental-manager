import { json, status } from '@rental/testing';
import { APARTMENT_ID, captureStderr, connect, STATEMENT_ID } from '../test/mcp-client.js';
import {
  apiLines,
  apiWarning,
  expectedLines,
  expectedWarning,
} from '../test/statement-fixtures.js';

const URL = `GET /statements/${STATEMENT_ID}`;

describe('get_statement', () => {
  it('returns the lines in UAH, without the lease, notes or user ids', async () => {
    const { call } = await connect({
      [URL]: json({
        id: STATEMENT_ID,
        apartmentId: APARTMENT_ID,
        period: '2026-10',
        status: 'CANCELLED',
        totalAmount: 1586400,
        warnings: [apiWarning],
        lines: apiLines,
        lease: { id: 'lease-1', primaryTenantName: 'Ivan Petrenko' },
        issuedAt: '2026-10-30T10:00:00.000Z',
        issuedById: 'user-1',
        cancelledAt: '2026-11-01T10:00:00.000Z',
        cancelledById: 'user-1',
        cancelNote: 'wrong gas reading',
      }),
    });
    const result = await call('get_statement', { statementId: STATEMENT_ID });

    expect(result.structuredContent).toEqual({
      id: STATEMENT_ID,
      apartmentId: APARTMENT_ID,
      period: '2026-10',
      status: 'CANCELLED',
      total: '15864.00',
      lines: expectedLines,
      warnings: [expectedWarning],
      issuedAt: '2026-10-30T10:00:00.000Z',
      cancelledAt: '2026-11-01T10:00:00.000Z',
    });
    expect(JSON.stringify(result)).not.toMatch(/Ivan|lease|user-1|wrong gas|photo-1/);
  });

  it('passes the API message of a 404 on', async () => {
    captureStderr();
    const { call } = await connect({ [URL]: status(404, { message: 'Statement not found' }) });
    const result = await call('get_statement', { statementId: STATEMENT_ID });
    expect(result).toMatchObject({
      isError: true,
      content: [{ text: 'get_statement failed: API responded 404: Statement not found' }],
    });
  });
});
