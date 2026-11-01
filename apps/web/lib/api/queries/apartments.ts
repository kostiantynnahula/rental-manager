import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { unwrap } from '@/lib/api/errors';
import type { components, operations } from '@/lib/api/schema';

export type Apartment = components['schemas']['ApartmentDetailResponseDto'];
export type CreateApartmentInput = components['schemas']['CreateApartmentDto'];
export type UpdateApartmentInput = components['schemas']['UpdateApartmentDto'];
export type ApartmentActiveFilter = NonNullable<
  NonNullable<operations['ApartmentsController_list']['parameters']['query']>['active']
>;

// Hierarchical keys: invalidating `lists()` refetches every filter variant, `all` everything.
export const apartmentKeys = {
  all: ['apartments'] as const,
  lists: () => [...apartmentKeys.all, 'list'] as const,
  list: (active: ApartmentActiveFilter) => [...apartmentKeys.lists(), { active }] as const,
  details: () => [...apartmentKeys.all, 'detail'] as const,
  detail: (id: string) => [...apartmentKeys.details(), id] as const,
};

export function useApartments(active: ApartmentActiveFilter) {
  return useQuery({
    queryKey: apartmentKeys.list(active),
    queryFn: async (): Promise<Apartment[]> =>
      unwrap(await api.GET('/apartments', { params: { query: { active } } })),
  });
}

export function useApartment(id: string, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: apartmentKeys.detail(id),
    enabled: options.enabled ?? true,
    queryFn: async (): Promise<Apartment> =>
      unwrap(await api.GET('/apartments/{id}', { params: { path: { id } } })),
  });
}

// Mutation responses are ApartmentResponseDto (no currentLease), so refetch instead of writing them into the cache.
function useInvalidateApartment() {
  const queryClient = useQueryClient();
  return (id: string) => {
    void queryClient.invalidateQueries({ queryKey: apartmentKeys.lists() });
    void queryClient.invalidateQueries({ queryKey: apartmentKeys.detail(id) });
  };
}

export function useCreateApartment() {
  const invalidate = useInvalidateApartment();
  return useMutation({
    mutationFn: async (body: CreateApartmentInput) =>
      unwrap(await api.POST('/apartments', { body })),
    onSuccess: (apartment) => invalidate(apartment.id),
  });
}

export function useUpdateApartment(id: string) {
  const invalidate = useInvalidateApartment();
  return useMutation({
    mutationFn: async (body: UpdateApartmentInput) =>
      unwrap(await api.PATCH('/apartments/{id}', { params: { path: { id } }, body })),
    onSuccess: () => invalidate(id),
  });
}

export function useArchiveApartment(id: string) {
  const invalidate = useInvalidateApartment();
  return useMutation({
    mutationFn: async () =>
      unwrap(await api.POST('/apartments/{id}/archive', { params: { path: { id } } })),
    onSuccess: () => invalidate(id),
  });
}

export function useUnarchiveApartment(id: string) {
  const invalidate = useInvalidateApartment();
  return useMutation({
    mutationFn: async () =>
      unwrap(await api.POST('/apartments/{id}/unarchive', { params: { path: { id } } })),
    onSuccess: () => invalidate(id),
  });
}
