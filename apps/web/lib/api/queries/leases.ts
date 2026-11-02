import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { unwrap } from '@/lib/api/errors';
import { apartmentKeys } from '@/lib/api/queries/apartments';
import { tenantKeys } from '@/lib/api/queries/tenants';
import type { components } from '@/lib/api/schema';

export type Lease = components['schemas']['LeaseResponseDto'];
export type CreateLeaseInput = components['schemas']['CreateLeaseDto'];
export type UpdateLeaseInput = components['schemas']['UpdateLeaseDto'];
export type LeaseTenantInput = components['schemas']['LeaseTenantInputDto'];

export const leaseKeys = {
  all: ['leases'] as const,
  apartment: (apartmentId: string) => [...leaseKeys.all, 'apartment', apartmentId] as const,
  details: () => [...leaseKeys.all, 'detail'] as const,
  detail: (id: string) => [...leaseKeys.details(), id] as const,
};

export function useApartmentLeases(apartmentId: string) {
  return useQuery({
    queryKey: leaseKeys.apartment(apartmentId),
    queryFn: async (): Promise<Lease[]> =>
      unwrap(
        await api.GET('/apartments/{apartmentId}/leases', { params: { path: { apartmentId } } }),
      ),
  });
}

export function useLease(id: string) {
  return useQuery({
    queryKey: leaseKeys.detail(id),
    queryFn: async (): Promise<Lease> =>
      unwrap(await api.GET('/leases/{id}', { params: { path: { id } } })),
  });
}

// A lease shows up on its apartment (current lease, Договори tab) and on every tenant's page (status, history),
// so every lease mutation refetches all three.
function useInvalidateLeaseViews() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: leaseKeys.all });
    void queryClient.invalidateQueries({ queryKey: apartmentKeys.all });
    void queryClient.invalidateQueries({ queryKey: tenantKeys.all });
  };
}

export function useCreateLease(apartmentId: string) {
  const invalidate = useInvalidateLeaseViews();
  return useMutation({
    mutationFn: async (body: CreateLeaseInput): Promise<Lease> =>
      unwrap(
        await api.POST('/apartments/{apartmentId}/leases', {
          params: { path: { apartmentId } },
          body,
        }),
      ),
    onSuccess: invalidate,
  });
}

export function useUpdateLease(id: string) {
  const invalidate = useInvalidateLeaseViews();
  return useMutation({
    mutationFn: async (body: UpdateLeaseInput): Promise<Lease> =>
      unwrap(await api.PATCH('/leases/{id}', { params: { path: { id } }, body })),
    onSuccess: invalidate,
  });
}

export function useReplaceLeaseTenants(id: string) {
  const invalidate = useInvalidateLeaseViews();
  return useMutation({
    mutationFn: async (tenants: LeaseTenantInput[]): Promise<Lease> =>
      unwrap(
        await api.PUT('/leases/{id}/tenants', { params: { path: { id } }, body: { tenants } }),
      ),
    onSuccess: invalidate,
  });
}

export function useEndLease(id: string) {
  const invalidate = useInvalidateLeaseViews();
  return useMutation({
    mutationFn: async (endDate: string): Promise<Lease> =>
      unwrap(await api.POST('/leases/{id}/end', { params: { path: { id } }, body: { endDate } })),
    onSuccess: invalidate,
  });
}

export function useDeleteLease(id: string) {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateLeaseViews();
  return useMutation({
    mutationFn: async () => unwrap(await api.DELETE('/leases/{id}', { params: { path: { id } } })),
    onSuccess: () => {
      // Remove, not invalidate: a refetch of the deleted lease would just 404.
      queryClient.removeQueries({ queryKey: leaseKeys.detail(id) });
      invalidate();
    },
  });
}
