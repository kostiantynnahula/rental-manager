import { isServer, QueryClient } from '@tanstack/react-query';
import { ApiError } from '@/lib/api/errors';

function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        // 4xx won't change on retry (401 is already handled by the auth middleware); retry network/5xx twice.
        retry: (failureCount, error) =>
          !(error instanceof ApiError && error.status < 500) && failureCount < 2,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

// One client per browser tab, shared by the React provider and the auth middleware (to clear the
// cache when the session ends). On the server a fresh one per call, so requests never share data.
export function getQueryClient(): QueryClient {
  if (isServer) return makeQueryClient();
  return (browserQueryClient ??= makeQueryClient());
}
