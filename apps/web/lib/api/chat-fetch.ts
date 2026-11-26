import { endSession, refreshOnce } from './auth-middleware';

// The chat stream is fetched by the AI SDK's transport, not the openapi-fetch client, so authMiddleware never sees
// it. Same rule here: a 401 → the shared single-flight refresh → one retry; refresh failed → end the session.
// The transport sends a JSON string body, so the same init can be sent twice (a ReadableStream body could not).
export const chatFetch: typeof fetch = async (input, init) => {
  const response = await fetch(input, init);
  if (response.status !== 401) return response;
  if (await refreshOnce()) return fetch(input, init);
  endSession();
  return response;
};
