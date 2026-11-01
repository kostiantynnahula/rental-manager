'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { getQueryClient } from '@/lib/query-client';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={getQueryClient()}>
      {children}
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools buttonPosition="top-right" />}
    </QueryClientProvider>
  );
}
