import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { unwrap } from '@/lib/api/errors';
import { apartmentKeys } from '@/lib/api/queries/apartments';
import type { components } from '@/lib/api/schema';

export type TenantListItem = components['schemas']['TenantListItemResponseDto'];
export type Tenant = components['schemas']['TenantDetailResponseDto'];
// What create/update return (no leases, no status).
export type TenantRecord = components['schemas']['TenantResponseDto'];
// POST /tenants: the tenant plus the lease from `assignment` (or null).
export type TenantCreated = components['schemas']['TenantCreatedResponseDto'];
export type TenantAssignmentInput = NonNullable<CreateTenantInput['assignment']>;
export type TenantLease = components['schemas']['TenantLeaseResponseDto'];
export type TenantStatus = components['schemas']['TenantStatus'];
export type LeaseTenantRole = components['schemas']['LeaseTenantRole'];
export type CreateTenantInput = components['schemas']['CreateTenantDto'];
export type UpdateTenantInput = components['schemas']['UpdateTenantDto'];

export const tenantKeys = {
  all: ['tenants'] as const,
  lists: () => [...tenantKeys.all, 'list'] as const,
  list: (search: string) => [...tenantKeys.lists(), { search }] as const,
  details: () => [...tenantKeys.all, 'detail'] as const,
  detail: (id: string) => [...tenantKeys.details(), id] as const,
};

// Search runs on the server (name or phone digits). keepPreviousData: the old rows stay while the next search
// loads, instead of a skeleton on every keystroke.
export function useTenants(search: string) {
  return useQuery({
    queryKey: tenantKeys.list(search),
    queryFn: async (): Promise<TenantListItem[]> =>
      unwrap(await api.GET('/tenants', { params: { query: search ? { search } : {} } })),
    placeholderData: keepPreviousData,
  });
}

export function useTenant(id: string) {
  return useQuery({
    queryKey: tenantKeys.detail(id),
    queryFn: async (): Promise<Tenant> =>
      unwrap(await api.GET('/tenants/{id}', { params: { path: { id } } })),
  });
}

export function useCreateTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateTenantInput): Promise<TenantCreated> =>
      unwrap(await api.POST('/tenants', { body })),
    onSuccess: (_created, body) => {
      void queryClient.invalidateQueries({ queryKey: tenantKeys.lists() });
      // A new or changed lease shows up in the apartment's currentLease.
      if (body.assignment) void queryClient.invalidateQueries({ queryKey: apartmentKeys.all });
    },
  });
}

export function useUpdateTenant(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: UpdateTenantInput) =>
      unwrap(await api.PATCH('/tenants/{id}', { params: { path: { id } }, body })),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: tenantKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: tenantKeys.detail(id) });
      // Apartments show their tenants' names and phones (currentLease.tenants).
      void queryClient.invalidateQueries({ queryKey: apartmentKeys.all });
    },
  });
}

export function useDeleteTenant(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => unwrap(await api.DELETE('/tenants/{id}', { params: { path: { id } } })),
    onSuccess: () => {
      // Remove, not invalidate: a refetch of the deleted tenant would just 404.
      queryClient.removeQueries({ queryKey: tenantKeys.detail(id) });
      void queryClient.invalidateQueries({ queryKey: tenantKeys.lists() });
    },
  });
}
