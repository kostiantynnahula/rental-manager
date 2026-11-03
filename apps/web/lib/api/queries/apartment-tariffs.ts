import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { unwrap } from '@/lib/api/errors';
import { tariffKeys } from '@/lib/api/queries/tariffs';
import type { components, operations } from '@/lib/api/schema';

export type ApartmentTariff = components['schemas']['ApartmentTariffResponseDto'];
export type CreateApartmentTariffInput = components['schemas']['CreateApartmentTariffDto'];
export type OverrideApartmentTariffInput = components['schemas']['OverrideApartmentTariffDto'];
export type ApartmentTariffScope = NonNullable<
  NonNullable<operations['ApartmentTariffsController_list']['parameters']['query']>['scope']
>;

export const apartmentTariffKeys = {
  all: ['apartment-tariffs'] as const,
  lists: () => [...apartmentTariffKeys.all, 'list'] as const,
  list: (apartmentId: string, scope: ApartmentTariffScope) =>
    [...apartmentTariffKeys.lists(), apartmentId, scope] as const,
};

// Tariffs attached to an apartment: current (not ended before this month, planned included) or all.
export function useApartmentTariffs(apartmentId: string, scope: ApartmentTariffScope) {
  return useQuery({
    queryKey: apartmentTariffKeys.list(apartmentId, scope),
    queryFn: async (): Promise<ApartmentTariff[]> =>
      unwrap(
        await api.GET('/apartments/{apartmentId}/tariffs', {
          params: { path: { apartmentId }, query: { scope } },
        }),
      ),
  });
}

// An attachment shows on the apartment tab and on the tariff (apartmentCount, "Квартири"), so both go stale.
function useInvalidateAttachments() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: apartmentTariffKeys.all });
    void queryClient.invalidateQueries({ queryKey: tariffKeys.all });
  };
}

export function useAttachTariff(apartmentId: string) {
  const invalidate = useInvalidateAttachments();
  return useMutation({
    mutationFn: async (body: CreateApartmentTariffInput): Promise<ApartmentTariff> =>
      unwrap(
        await api.POST('/apartments/{apartmentId}/tariffs', {
          params: { path: { apartmentId } },
          body,
        }),
      ),
    onSuccess: invalidate,
  });
}

// activeTo = last billed month ("YYYY-MM"); null reopens an ended attachment.
export function useEndApartmentTariff(apartmentId: string) {
  const invalidate = useInvalidateAttachments();
  return useMutation({
    mutationFn: async ({
      id,
      activeTo,
    }: {
      id: string;
      activeTo: string | null;
    }): Promise<ApartmentTariff> =>
      unwrap(
        await api.PATCH('/apartments/{apartmentId}/tariffs/{id}', {
          params: { path: { apartmentId, id } },
          body: { activeTo },
        }),
      ),
    onSuccess: invalidate,
  });
}

export function useDeleteApartmentTariff(apartmentId: string) {
  const invalidate = useInvalidateAttachments();
  return useMutation({
    mutationFn: async (id: string) =>
      unwrap(
        await api.DELETE('/apartments/{apartmentId}/tariffs/{id}', {
          params: { path: { apartmentId, id } },
        }),
      ),
    onSuccess: invalidate,
  });
}

// "Only for this apartment": a copy of the shared tariff with its own prices from a month on.
export function useOverrideApartmentTariff(apartmentId: string) {
  const invalidate = useInvalidateAttachments();
  return useMutation({
    mutationFn: async ({
      id,
      body,
    }: {
      id: string;
      body: OverrideApartmentTariffInput;
    }): Promise<ApartmentTariff> =>
      unwrap(
        await api.POST('/apartments/{apartmentId}/tariffs/{id}/override', {
          params: { path: { apartmentId, id } },
          body,
        }),
      ),
    onSuccess: invalidate,
  });
}
