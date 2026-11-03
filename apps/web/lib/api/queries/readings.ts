import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { unwrap } from '@/lib/api/errors';
import { meterKeys } from '@/lib/api/queries/meters';
import type { components } from '@/lib/api/schema';

export type Reading = components['schemas']['ReadingResponseDto'];
export type CreateReadingInput = components['schemas']['CreateReadingDto'];

// One hook for any meter (the batch form posts for several meters with one instance).
export function useCreateReading() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      meterId,
      body,
    }: {
      meterId: string;
      body: CreateReadingInput;
    }): Promise<Reading> =>
      unwrap(await api.POST('/meters/{meterId}/readings', { params: { path: { meterId } }, body })),
    // A confirmed reading becomes the meter's last values (meter cards, previous values).
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: meterKeys.all }),
  });
}
