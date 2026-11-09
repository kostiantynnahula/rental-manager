import { UnrecoverableError } from 'bullmq';

// Turns a failed API call into a job error. UnrecoverableError = BullMQ won't retry (retrying can't help);
// a plain Error is retried with the job's attempts/backoff. Only status + the body's message: never headers.
export function apiError(what: string, response: Response, body: unknown): Error {
  const message =
    typeof body === 'object' && body !== null && 'message' in body ? String(body.message) : '';
  const detail = `${what}: HTTP ${response.status}${message ? ` (${message})` : ''}`;
  if (response.status === 401 || response.status === 403) {
    return new UnrecoverableError(`${detail} — check API_KEY and its scopes`);
  }
  if (response.status === 404 || response.status === 400) return new UnrecoverableError(detail);
  return new Error(detail);
}
