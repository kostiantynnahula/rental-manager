'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { unwrap } from '@/lib/api/errors';
import type { components } from '@/lib/api/schema';
import { getQueryClient } from '@/lib/query-client';

export type CurrentUser = components['schemas']['UserResponseDto'];

export const meQueryKey = ['auth', 'me'] as const;

export function useMe() {
  return useQuery({
    queryKey: meQueryKey,
    queryFn: async (): Promise<CurrentUser> => unwrap(await api.GET('/auth/me')),
    staleTime: 5 * 60_000,
  });
}

export function useLogout() {
  return useMutation({
    mutationFn: async () => {
      unwrap(await api.POST('/auth/logout'));
    },
    onSuccess: () => {
      getQueryClient().clear();
      // Full navigation (not router.replace): drops all in-memory state of the old session at once.
      window.location.replace('/login');
    },
  });
}
