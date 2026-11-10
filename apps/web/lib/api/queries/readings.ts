import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { unwrap } from '@/lib/api/errors';
import { meterKeys } from '@/lib/api/queries/meters';
import { photoKeys } from '@/lib/api/queries/photos';
import type { components, operations } from '@/lib/api/schema';

export type Reading = components['schemas']['ReadingResponseDto'];
export type ReadingValue = Reading['values'][number];
export type CreateReadingInput = components['schemas']['CreateReadingDto'];
export type UpdateReadingInput = components['schemas']['UpdateReadingDto'];
export type ReadingValueInput = CreateReadingInput['values'][number];
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
    onSuccess: (_reading, { body }) => invalidateAfterReading(queryClient, body.values),
  });
}

// Edits a DRAFT: `values` replace all of them (send the kept ones with their photoId).
export function useUpdateReading() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: UpdateReadingInput }): Promise<Reading> =>
      unwrap(await api.PATCH('/readings/{id}', { params: { path: { id } }, body })),
    onSuccess: (_reading, { body }) => invalidateAfterReading(queryClient, body.values),
  });
}

// DRAFT → CONFIRMED; the API refuses an incomplete draft (a zone missing).
export function useConfirmReading() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<Reading> =>
      unwrap(await api.POST('/readings/{id}/confirm', { params: { path: { id } } })),
    onSuccess: (reading) => invalidateAfterReading(queryClient, reading.values),
  });
}

// A confirmed reading becomes the meter's last values (meter cards, previous values) and a history row; a value
// with a photoId also takes the photo out of "unassigned" (and changes what the photo lists as taken from it).
function invalidateAfterReading(
  queryClient: QueryClient,
  values: ReadonlyArray<{ photoId?: string | null }> | undefined,
) {
  void queryClient.invalidateQueries({ queryKey: meterKeys.all });
  void queryClient.invalidateQueries({ queryKey: readingKeys.all });
  if (values?.some((v) => v.photoId))
    void queryClient.invalidateQueries({ queryKey: photoKeys.all });
}
