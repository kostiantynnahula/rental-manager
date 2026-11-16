import { UnrecoverableError } from 'bullmq';
import { apiError } from './api-error.js';

const response = (status: number) => new Response(null, { status });

describe('apiError', () => {
  it.each([400, 404])('%i → UnrecoverableError (no retry)', (status) => {
    const err = apiError('GET /photos/p1', response(status), {});
    expect(err).toBeInstanceOf(UnrecoverableError);
    expect(err.message).toBe(`GET /photos/p1: HTTP ${status}`);
  });

  it.each([401, 403])('%i → UnrecoverableError with a key hint', (status) => {
    const err = apiError('GET /photos/p1', response(status), {});
    expect(err).toBeInstanceOf(UnrecoverableError);
    expect(err.message).toContain('check WORKER_API_KEY and its scopes');
  });

  it.each([500, 503])('%i → plain Error (retried)', (status) => {
    const err = apiError('GET /photos/p1', response(status), {});
    expect(err).not.toBeInstanceOf(UnrecoverableError);
    expect(err).toBeInstanceOf(Error);
  });

  it("includes the body's message", () => {
    const err = apiError('POST /meters/m1/draft-values', response(400), {
      message: 'value must be a decimal',
    });
    expect(err.message).toBe('POST /meters/m1/draft-values: HTTP 400 (value must be a decimal)');
  });

  it('ignores a body without a message', () => {
    expect(apiError('GET /x', response(500), 'oops').message).toBe('GET /x: HTTP 500');
    expect(apiError('GET /x', response(500), null).message).toBe('GET /x: HTTP 500');
  });
});
