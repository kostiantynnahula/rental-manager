import { json, status } from '@rental/testing';
import { APARTMENT_ID, captureStderr, connect, TARIFF_ID } from '../test/mcp-client.js';
import {
  apiLines,
  apiWarning,
  expectedLines,
  expectedWarning,
} from '../test/statement-fixtures.js';

const URL = `POST /apartments/${APARTMENT_ID}/statements/preview`;

describe('preview_statement', () => {
  it('sends manual amounts in kopiyky and returns the calculation in UAH', async () => {
    const { call, requests } = await connect({
      [URL]: json({ period: '2026-11', total: 1586400, lines: apiLines, warnings: [apiWarning] }),
    });
    const result = await call('preview_statement', {
      apartmentId: APARTMENT_ID,
      period: '2026-11',
      manualAmounts: { [TARIFF_ID]: '123.4' },
    });

    expect(requests[0].body).toEqual({ period: '2026-11', manualAmounts: { [TARIFF_ID]: 12340 } });
    expect(result.structuredContent).toEqual({
      period: '2026-11',
      total: '15864.00',
      lines: expectedLines,
      warnings: [expectedWarning],
    });
  });

  it('rejects a manual amount that is not UAH without calling the API', async () => {
    const { call, requests } = await connect({});
    const result = await call('preview_statement', {
      apartmentId: APARTMENT_ID,
      period: '2026-11',
      manualAmounts: { [TARIFF_ID]: '12.345' },
    });
    expect(result.isError).toBe(true);
    expect(requests).toEqual([]);
  });

  it('passes a 400 message on', async () => {
    captureStderr();
    const message = 'manualAmounts: not an active MANUAL tariff of the apartment';
    const { call } = await connect({ [URL]: status(400, { message }) });
    const result = await call('preview_statement', {
      apartmentId: APARTMENT_ID,
      period: '2026-11',
    });
    expect(result).toMatchObject({
      isError: true,
      content: [{ text: `preview_statement failed: API responded 400: ${message}` }],
    });
  });
});
