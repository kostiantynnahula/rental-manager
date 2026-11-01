import type { Middleware } from 'openapi-fetch';
import { loginUrl } from '@/lib/auth/redirect';
import { getQueryClient } from '@/lib/query-client';

// Their 401 means "wrong credentials" or "session is dead" — refreshing won't help (and refresh → refresh loops).
// /auth/me is deliberately NOT here: after the access TTL it must refresh like any other call.
const NO_REFRESH_PATHS = new Set(['/api/auth/login', '/api/auth/refresh', '/api/auth/logout']);

// A request's body can be read only once, so keep a copy to replay after a refresh (keyed by openapi-fetch's request id).
const replayable = new Map<string, Request>();

let refreshInFlight: Promise<boolean> | null = null;

// Single-flight: parallel 401s await the same refresh. Important because the API rotates the refresh token —
// a second concurrent refresh would present the already-revoked token and count as reuse (all sessions revoked).
function refreshOnce(): Promise<boolean> {
  refreshInFlight ??= fetch('/api/auth/refresh', { method: 'POST', credentials: 'same-origin' })
    .then(
      (response) => response.ok,
      () => false,
    )
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
}

function endSession(): void {
  getQueryClient().clear();
  const { pathname, search } = window.location;
  if (pathname !== '/login') window.location.assign(loginUrl(pathname + search));
}

export const authMiddleware: Middleware = {
  onRequest({ request, id }) {
    if (!NO_REFRESH_PATHS.has(new URL(request.url).pathname)) replayable.set(id, request.clone());
  },
  async onResponse({ response, id }) {
    const replay = replayable.get(id);
    replayable.delete(id);
    if (!replay || response.status !== 401) return undefined;
    // Plain fetch, not the client: the retry doesn't pass through this middleware, so it happens at most once.
    if (await refreshOnce()) return fetch(replay);
    endSession();
    return undefined; // the original 401 reaches the caller
  },
  onError({ id }) {
    replayable.delete(id);
  },
};
