import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { unwrap } from '@/lib/api/errors';
import type { components } from '@/lib/api/schema';

export type Meter = components['schemas']['MeterResponseDto'];
export type ReadingValue = components['schemas']['ReadingValueResponseDto'];
export type ReadingValueInput = components['schemas']['ReadingValueInputDto'];
export type CreateMeterInput = components['schemas']['CreateMeterDto'];
export type UpdateMeterInput = components['schemas']['UpdateMeterDto'];
export type RemoveMeterInput = components['schemas']['RemoveMeterDto'];
export type ReplaceMeterInput = components['schemas']['ReplaceMeterDto'];

export const meterKeys = {
  all: ['meters'] as const,
  apartments: () => [...meterKeys.all, 'apartment'] as const,
  apartment: (apartmentId: string, includeRemoved: boolean) =>
    [...meterKeys.apartments(), apartmentId, { includeRemoved }] as const,
  details: () => [...meterKeys.all, 'detail'] as const,
  detail: (id: string) => [...meterKeys.details(), id] as const,
};

export function useApartmentMeters(apartmentId: string, includeRemoved: boolean) {
  return useQuery({
    queryKey: meterKeys.apartment(apartmentId, includeRemoved),
    queryFn: async (): Promise<Meter[]> =>
      unwrap(
        await api.GET('/apartments/{apartmentId}/meters', {
          params: {
            path: { apartmentId },
            query: { includeRemoved: includeRemoved ? 'true' : 'false' },
          },
        }),
      ),
  });
}

export function useMeter(id: string) {
  return useQuery({
    queryKey: meterKeys.detail(id),
    queryFn: async (): Promise<Meter> =>
      unwrap(await api.GET('/meters/{id}', { params: { path: { id } } })),
  });
}

// Every meter change can alter another meter's card too (replace = remove + install), so refetch all meters.
// TODO: also invalidate readings keys once the readings UI has them (INITIAL/FINAL readings change here).
function useInvalidateMeters() {
  const queryClient = useQueryClient();
  return () => void queryClient.invalidateQueries({ queryKey: meterKeys.all });
}

export function useCreateMeter(apartmentId: string) {
  const invalidate = useInvalidateMeters();
  return useMutation({
    mutationFn: async (body: CreateMeterInput): Promise<Meter> =>
      unwrap(
        await api.POST('/apartments/{apartmentId}/meters', {
          params: { path: { apartmentId } },
          body,
        }),
      ),
    onSuccess: invalidate,
  });
}

export function useUpdateMeter(id: string) {
  const invalidate = useInvalidateMeters();
  return useMutation({
    mutationFn: async (body: UpdateMeterInput): Promise<Meter> =>
      unwrap(await api.PATCH('/meters/{id}', { params: { path: { id } }, body })),
    onSuccess: invalidate,
  });
}

export function useFixInitialValues(id: string) {
  const invalidate = useInvalidateMeters();
  return useMutation({
    mutationFn: async (initialValues: ReadingValueInput[]): Promise<Meter> =>
      unwrap(
        await api.PUT('/meters/{id}/initial-values', {
          params: { path: { id } },
          body: { initialValues },
        }),
      ),
    onSuccess: invalidate,
  });
}

export function useRemoveMeter(id: string) {
  const invalidate = useInvalidateMeters();
  return useMutation({
    mutationFn: async (body: RemoveMeterInput): Promise<Meter> =>
      unwrap(await api.POST('/meters/{id}/remove', { params: { path: { id } }, body })),
    onSuccess: invalidate,
  });
}

export function useReplaceMeter(id: string) {
  const invalidate = useInvalidateMeters();
  return useMutation({
    mutationFn: async (body: ReplaceMeterInput) =>
      unwrap(await api.POST('/meters/{id}/replace', { params: { path: { id } }, body })),
    onSuccess: invalidate,
  });
}

export function useDeleteMeter(id: string) {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateMeters();
  return useMutation({
    mutationFn: async () => unwrap(await api.DELETE('/meters/{id}', { params: { path: { id } } })),
    onSuccess: () => {
      // Remove, not invalidate: a refetch of the deleted meter would just 404.
      queryClient.removeQueries({ queryKey: meterKeys.detail(id) });
      invalidate();
    },
  });
}
