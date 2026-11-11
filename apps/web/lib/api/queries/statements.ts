import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { unwrap } from '@/lib/api/errors';
import type { components, operations } from '@/lib/api/schema';

export type Statement = components['schemas']['StatementResponseDto'];
export type StatementListItem = components['schemas']['StatementListItemResponseDto'];
export type StatementPage = components['schemas']['StatementPageResponseDto'];
export type StatementPreview = components['schemas']['StatementPreviewResponseDto'];
export type StatementLine = components['schemas']['StatementLineResponseDto'];
export type StatementWarning = components['schemas']['StatementWarningResponseDto'];
export type StatementStatus = components['schemas']['StatementStatus'];
export type IssueStatementInput = components['schemas']['IssueStatementDto'];
// Integer kopiyky per MANUAL tariff id.
export type ManualAmounts = Record<string, number>;
export type StatementListQuery = NonNullable<
  operations['ApartmentStatementsController_list']['parameters']['query']
>;
export type StatementPageSize = NonNullable<StatementListQuery['pageSize']>;

export const statementKeys = {
  all: ['statements'] as const,
  lists: (apartmentId: string) => [...statementKeys.all, 'list', apartmentId] as const,
  list: (apartmentId: string, query: StatementListQuery) =>
    [...statementKeys.lists(apartmentId), query] as const,
  // Prefix of every preview of the month, whatever the manual amounts (what mutations invalidate).
  preview: (apartmentId: string, period: string) =>
    [...statementKeys.all, 'preview', apartmentId, period] as const,
  previewWith: (apartmentId: string, period: string, manualAmounts: ManualAmounts) =>
    [...statementKeys.preview(apartmentId, period), manualAmounts] as const,
  detail: (id: string) => [...statementKeys.all, 'detail', id] as const,
};

async function fetchStatements(
  apartmentId: string,
  query: StatementListQuery,
): Promise<StatementPage> {
  return unwrap(
    await api.GET('/apartments/{apartmentId}/statements', {
      params: { path: { apartmentId }, query },
    }),
  );
}

// staleTime 0: readings or tariffs may have changed elsewhere, so coming back to the page always refreshes it.
// The previous data is kept only while the manual amounts change within the same apartment + month (no skeleton
// flash while typing); another month's total must never be on screen, ready to be issued.
// A POST (manualAmounts is a map), but it writes nothing: still a query.
export function useStatementPreview(
  apartmentId: string,
  period: string,
  manualAmounts: ManualAmounts,
) {
  return useQuery({
    queryKey: statementKeys.previewWith(apartmentId, period, manualAmounts),
    queryFn: async (): Promise<StatementPreview> =>
      unwrap(
        await api.POST('/apartments/{apartmentId}/statements/preview', {
          params: { path: { apartmentId } },
          body: { period, manualAmounts },
        }),
      ),
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[2] === apartmentId && previousQuery.queryKey[3] === period
        ? previous
        : undefined,
    staleTime: 0,
  });
}

export function useStatements(apartmentId: string, page: number, pageSize: StatementPageSize) {
  const query: StatementListQuery = { page, pageSize };
  return useQuery({
    queryKey: statementKeys.list(apartmentId, query),
    queryFn: () => fetchStatements(apartmentId, query),
    placeholderData: keepPreviousData,
  });
}

// The month's issued statement, or null. At most one exists, and it's the newest of the month: the first page has it.
export function useIssuedStatement(apartmentId: string, period: string) {
  const query: StatementListQuery = { period };
  return useQuery({
    queryKey: statementKeys.list(apartmentId, query),
    queryFn: () => fetchStatements(apartmentId, query),
    select: (page) => page.items.find((s) => s.status === 'ISSUED') ?? null,
    staleTime: 0,
  });
}

export function useStatement(id: string) {
  return useQuery({
    queryKey: statementKeys.detail(id),
    queryFn: async (): Promise<Statement> =>
      unwrap(await api.GET('/statements/{id}', { params: { path: { id } } })),
  });
}

// onSettled: a 409 means the data changed (or the month got issued), so the screen must refresh after a failure too.
export function useIssueStatement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      apartmentId,
      body,
    }: {
      apartmentId: string;
      body: IssueStatementInput;
    }): Promise<Statement> =>
      unwrap(
        await api.POST('/apartments/{apartmentId}/statements', {
          params: { path: { apartmentId } },
          body,
        }),
      ),
    onSettled: (_statement, _error, { apartmentId, body }) => {
      void queryClient.invalidateQueries({ queryKey: statementKeys.lists(apartmentId) });
      void queryClient.invalidateQueries({
        queryKey: statementKeys.preview(apartmentId, body.period),
      });
    },
  });
}

export function useCancelStatement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      note,
    }: {
      id: string;
      apartmentId: string;
      period: string;
      note?: string;
    }): Promise<Statement> =>
      unwrap(
        await api.POST('/statements/{id}/cancel', { params: { path: { id } }, body: { note } }),
      ),
    onSettled: (_statement, _error, { id, apartmentId, period }) => {
      void queryClient.invalidateQueries({ queryKey: statementKeys.lists(apartmentId) });
      void queryClient.invalidateQueries({ queryKey: statementKeys.detail(id) });
      void queryClient.invalidateQueries({ queryKey: statementKeys.preview(apartmentId, period) });
    },
  });
}
