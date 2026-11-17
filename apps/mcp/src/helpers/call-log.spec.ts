import { json, status } from '@rental/testing';
import { captureStderr, connect, STATEMENT_ID } from '../test/mcp-client.js';
import { formatArgs } from './call-log.js';

const apartment = {
  id: 'apt-1',
  name: 'Kyiv, Khreshchatyk 1',
  address: 'Khreshchatyk St 1, apt 5',
  notes: 'private note',
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('tool call log', () => {
  it('logs a successful call with its arguments, never the response', async () => {
    const stderr = captureStderr();
    const { call } = await connect({
      'GET /apartments?active=true': json([apartment]),
    });
    await call('list_apartments', { includeArchived: false });
    expect(stderr()).toMatch(
      /^\[rental-mcp\] tool list_apartments \{"includeArchived":false\} → ok \d+ms\n$/,
    );
    expect(stderr()).not.toMatch(/Khreshchatyk|private note/);
  });

  it('logs a failed call with the status and the API message, never the body', async () => {
    const stderr = captureStderr();
    const { call } = await connect({
      [`GET /statements/${STATEMENT_ID}`]: status(404, {
        message: 'Statement not found',
        detail: 'secret detail',
      }),
    });
    await call('get_statement', { statementId: STATEMENT_ID });
    expect(stderr()).toMatch(
      new RegExp(
        `^\\[rental-mcp\\] tool get_statement \\{"statementId":"${STATEMENT_ID}"\\} → error 404 "Statement not found" \\d+ms\\n$`,
      ),
    );
    expect(stderr()).not.toContain('secret detail');
  });

  it('logs an unreachable API with the thrown error', async () => {
    const stderr = captureStderr();
    const { call } = await connect({
      'GET /apartments?active=true': () => {
        throw new TypeError('fetch failed');
      },
    });
    await call('list_apartments');
    expect(stderr()).toMatch(
      /tool list_apartments \{\} → error unreachable \(fetch failed\) \d+ms\n$/,
    );
  });

  it('truncates long arguments', () => {
    expect(formatArgs({ note: 'x'.repeat(500) })).toBe(`{"note":"${'x'.repeat(191)}…`);
    expect(formatArgs(undefined)).toBe('{}');
  });
});
