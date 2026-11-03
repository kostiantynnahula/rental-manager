import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { unwrap } from '@/lib/api/errors';
import { apartmentTariffKeys } from '@/lib/api/queries/apartment-tariffs';
import type { components, operations } from '@/lib/api/schema';

export type Tariff = components['schemas']['TariffResponseDto'];
export type TariffDetail = components['schemas']['TariffDetailResponseDto'];
export type TariffPrice = components['schemas']['TariffPriceResponseDto'];
export type TariffApartment = components['schemas']['TariffApartmentResponseDto'];
export type TariffPage = components['schemas']['TariffPageResponseDto'];
export type TariffKind = components['schemas']['TariffKind'];
export type CreateTariffInput = components['schemas']['CreateTariffDto'];
export type UpdateTariffInput = components['schemas']['UpdateTariffDto'];
export type TariffPriceInput = components['schemas']['TariffPriceInputDto'];
export type UpdateTariffPriceInput = components['schemas']['UpdateTariffPriceDto'];
export type TariffListQuery = NonNullable<
  operations['TariffsController_list']['parameters']['query']
>;
export type TariffActiveFilter = NonNullable<TariffListQuery['active']>;
export type TariffPageSize = NonNullable<TariffListQuery['pageSize']>;

export const tariffKeys = {
  all: ['tariffs'] as const,
  lists: () => [...tariffKeys.all, 'list'] as const,
  list: (query: TariffListQuery) => [...tariffKeys.lists(), query] as const,
  details: () => [...tariffKeys.all, 'detail'] as const,
  detail: (id: string) => [...tariffKeys.details(), id] as const,
};

// Server-side search and pagination; the previous page stays on screen while the next one loads.
export function useTariffs(query: TariffListQuery) {
  return useQuery({
    queryKey: tariffKeys.list(query),
    queryFn: async (): Promise<TariffPage> =>
      unwrap(await api.GET('/tariffs', { params: { query } })),
    placeholderData: keepPreviousData,
  });
}

export function useTariff(id: string) {
  return useQuery({
    queryKey: tariffKeys.detail(id),
    queryFn: async (): Promise<TariffDetail> =>
      unwrap(await api.GET('/tariffs/{id}', { params: { path: { id } } })),
  });
}

// Every change can move a tariff in the list (name, archive) or change its current prices — also shown on the
// apartments' "Тарифи" tabs.
function useInvalidateTariff() {
  const queryClient = useQueryClient();
  return (id: string) => {
    void queryClient.invalidateQueries({ queryKey: tariffKeys.lists() });
    void queryClient.invalidateQueries({ queryKey: tariffKeys.detail(id) });
    void queryClient.invalidateQueries({ queryKey: apartmentTariffKeys.all });
  };
}

export function useCreateTariff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateTariffInput): Promise<TariffDetail> =>
      unwrap(await api.POST('/tariffs', { body })),
    onSuccess: (_created, body) => {
      void queryClient.invalidateQueries({ queryKey: tariffKeys.lists() });
      // Attached right away → the apartments' "Тарифи" tabs change too.
      if (body.apartmentIds?.length) {
        void queryClient.invalidateQueries({ queryKey: apartmentTariffKeys.all });
      }
    },
  });
}

export function useUpdateTariff(id: string) {
  const invalidate = useInvalidateTariff();
  return useMutation({
    mutationFn: async (body: UpdateTariffInput): Promise<TariffDetail> =>
      unwrap(await api.PATCH('/tariffs/{id}', { params: { path: { id } }, body })),
    onSuccess: () => invalidate(id),
  });
}

export function useArchiveTariff(id: string) {
  const invalidate = useInvalidateTariff();
  return useMutation({
    mutationFn: async () =>
      unwrap(await api.POST('/tariffs/{id}/archive', { params: { path: { id } } })),
    onSuccess: () => invalidate(id),
  });
}

export function useUnarchiveTariff(id: string) {
  const invalidate = useInvalidateTariff();
  return useMutation({
    mutationFn: async () =>
      unwrap(await api.POST('/tariffs/{id}/unarchive', { params: { path: { id } } })),
    onSuccess: () => invalidate(id),
  });
}

export function useDeleteTariff(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => unwrap(await api.DELETE('/tariffs/{id}', { params: { path: { id } } })),
    onSuccess: () => {
      // Remove, not invalidate: a refetch of the deleted tariff would just 404.
      queryClient.removeQueries({ queryKey: tariffKeys.detail(id) });
      void queryClient.invalidateQueries({ queryKey: tariffKeys.lists() });
    },
  });
}

// A price change from some month on (a new row; older prices stay for past months).
export function useAddTariffPrice(tariffId: string) {
  const invalidate = useInvalidateTariff();
  return useMutation({
    mutationFn: async (body: TariffPriceInput): Promise<TariffPrice> =>
      unwrap(await api.POST('/tariffs/{id}/prices', { params: { path: { id: tariffId } }, body })),
    onSuccess: () => invalidate(tariffId),
  });
}

// Fixes a mistyped price row.
export function useUpdateTariffPrice(tariffId: string) {
  const invalidate = useInvalidateTariff();
  return useMutation({
    mutationFn: async ({
      priceId,
      body,
    }: {
      priceId: string;
      body: UpdateTariffPriceInput;
    }): Promise<TariffPrice> =>
      unwrap(
        await api.PATCH('/tariffs/{id}/prices/{priceId}', {
          params: { path: { id: tariffId, priceId } },
          body,
        }),
      ),
    onSuccess: () => invalidate(tariffId),
  });
}

export function useDeleteTariffPrice(tariffId: string) {
  const invalidate = useInvalidateTariff();
  return useMutation({
    mutationFn: async (priceId: string) =>
      unwrap(
        await api.DELETE('/tariffs/{id}/prices/{priceId}', {
          params: { path: { id: tariffId, priceId } },
        }),
      ),
    onSuccess: () => invalidate(tariffId),
  });
}
