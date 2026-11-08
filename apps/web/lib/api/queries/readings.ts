import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { unwrap } from '@/lib/api/errors';
import { meterKeys } from '@/lib/api/queries/meters';
import { photoKeys } from '@/lib/api/queries/photos';
import type { components, operations } from '@/lib/api/schema';

export type Reading = components['schemas']['ReadingResponseDto'];
export type CreateReadingInput = components['schemas']['CreateReadingDto'];
export type ApartmentMeterReading = components['schemas']['ApartmentMeterReadingResponseDto'];
export type PeriodReadingStatus = components['schemas']['PeriodReadingStatus'];
export type ReadingHistoryPage = components['schemas']['ReadingHistoryPageResponseDto'];
export type ReadingHistoryItem = components['schemas']['ReadingHistoryItemResponseDto'];
export type ReadingHistoryValue = components['schemas']['ReadingHistoryValueResponseDto'];
export type ReadingHistoryQuery = NonNullable<
  operations['ApartmentReadingsController_history']['parameters']['query']
>;

export const readingKeys = {
  all: ['readings'] as const,
  histories: () => [...readingKeys.all, 'history'] as const,
  history: (apartmentId: string, query: ReadingHistoryQuery) =>
    [...readingKeys.histories(), apartmentId, query] as const,
  periods: () => [...readingKeys.all, 'period'] as const,
  period: (apartmentId: string, period: string) =>
    [...readingKeys.periods(), apartmentId, period] as const,
};

// Meters active in the month with their status (MISSING / DRAFT / CONFIRMED). The previous month's list stays
// on screen while another month loads.
export function useApartmentPeriodReadings(
  apartmentId: string,
  period: string,
  { enabled = true }: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: readingKeys.period(apartmentId, period),
    queryFn: async (): Promise<ApartmentMeterReading[]> =>
      unwrap(
        await api.GET('/apartments/{apartmentId}/readings', {
          params: { path: { apartmentId }, query: { period } },
        }),
      ),
    placeholderData: keepPreviousData,
    enabled,
  });
}

// Server-side paginated; the previous page stays on screen while the next one loads.
export function useReadingHistory(
  apartmentId: string,
  query: ReadingHistoryQuery,
  { enabled = true }: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: readingKeys.history(apartmentId, query),
    queryFn: async (): Promise<ReadingHistoryPage> =>
      unwrap(
        await api.GET('/apartments/{apartmentId}/readings/history', {
          params: { path: { apartmentId }, query },
        }),
      ),
    placeholderData: keepPreviousData,
    enabled,
  });
}

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
    // A confirmed reading becomes the meter's last values (meter cards, previous values) and a history row;
    // with a photoId it also takes the photo out of "unassigned".
    onSuccess: (_reading, { body }) => {
      void queryClient.invalidateQueries({ queryKey: meterKeys.all });
      void queryClient.invalidateQueries({ queryKey: readingKeys.all });
      if (body.photoId) void queryClient.invalidateQueries({ queryKey: photoKeys.all });
    },
  });
}
