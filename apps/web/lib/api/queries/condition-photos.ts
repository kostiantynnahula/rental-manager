import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PHOTO_MAX_FILES } from '@/components/photos/constants/upload';
import { api } from '@/lib/api/client';
import { unwrap } from '@/lib/api/errors';
import type { components } from '@/lib/api/schema';

export type ConditionPhoto = components['schemas']['ConditionPhotoResponseDto'];
export type ConditionPhotoEvent = components['schemas']['ConditionPhotoEvent'];
export type ConditionPhotoUploadResult = components['schemas']['ConditionPhotoUploadResultDto'];
export type UpdateConditionPhotoInput = components['schemas']['UpdateConditionPhotoDto'];
export type ConditionPhotoSearchResult = components['schemas']['ConditionPhotoSearchResultDto'];
export type ConditionPhotoDescription = components['schemas']['ConditionPhotoDescriptionDto'];
export type ConditionPhotoRoom = components['schemas']['ConditionPhotoRoom'];
export type ConditionPhotoIndexStatus = components['schemas']['ConditionPhotoIndexStatus'];
export type ConditionPhotoDetail = components['schemas']['ConditionPhotoDetailResponseDto'];
export type ConditionPhotoItem = components['schemas']['ConditionPhotoItemDto'];

// The detail page polls while the worker describes the photo (PENDING) or it's being embedded (DESCRIBED).
const INDEX_POLL_MS = 5000;

// Inclusive `takenOn` range ("YYYY-MM-DD"; a lease page passes its dates) and an event (the apartment tab's filter).
export interface ConditionPhotoFilter {
  from?: string;
  to?: string;
  event?: ConditionPhotoEvent;
}

export interface UploadConditionPhotosInput {
  files: File[];
  event: ConditionPhotoEvent;
  takenOn: string;
  note: string | null;
}

// A chunk failed after earlier chunks were stored: those photos are saved, the rest are not.
export class UploadPartialError extends Error {
  constructor(
    readonly uploaded: number,
    readonly total: number,
    readonly reason: unknown,
  ) {
    super(`Uploaded ${uploaded} of ${total}`);
    this.name = 'UploadPartialError';
  }
}

export const conditionPhotoKeys = {
  all: ['condition-photos'] as const,
  lists: () => [...conditionPhotoKeys.all, 'list'] as const,
  list: (apartmentId: string, filter: ConditionPhotoFilter) =>
    [...conditionPhotoKeys.lists(), apartmentId, filter] as const,
  searches: () => [...conditionPhotoKeys.all, 'search'] as const,
  search: (apartmentId: string, q: string, event: ConditionPhotoEvent | undefined) =>
    [...conditionPhotoKeys.searches(), apartmentId, q, event] as const,
  details: () => [...conditionPhotoKeys.all, 'detail'] as const,
  detail: (id: string) => [...conditionPhotoKeys.details(), id] as const,
};

// Newest `takenOn` first (API order).
export function useConditionPhotos(apartmentId: string, filter: ConditionPhotoFilter = {}) {
  return useQuery({
    queryKey: conditionPhotoKeys.list(apartmentId, filter),
    queryFn: async (): Promise<ConditionPhoto[]> =>
      unwrap(
        await api.GET('/apartments/{apartmentId}/condition-photos', {
          params: {
            path: { apartmentId },
            query: { from: filter.from, to: filter.to, event: filter.event },
          },
        }),
      ),
  });
}

// Semantic search over the worker's descriptions: most relevant first, only INDEXED photos (the API's default
// limit). Off while `q` is empty. keepPreviousData: the old results stay while the next query loads.
export function useConditionPhotoSearch(
  apartmentId: string,
  q: string,
  event: ConditionPhotoEvent | undefined,
) {
  return useQuery({
    queryKey: conditionPhotoKeys.search(apartmentId, q, event),
    queryFn: async (): Promise<ConditionPhotoSearchResult[]> =>
      unwrap(
        await api.GET('/apartments/{apartmentId}/condition-photos/search', {
          params: { path: { apartmentId }, query: { q, event } },
        }),
      ),
    enabled: q !== '',
    placeholderData: keepPreviousData,
  });
}

// One photo with its derived lease and the worker's last description (the detail page).
export function useConditionPhoto(id: string) {
  return useQuery({
    queryKey: conditionPhotoKeys.detail(id),
    queryFn: async (): Promise<ConditionPhotoDetail> =>
      unwrap(await api.GET('/condition-photos/{id}', { params: { path: { id } } })),
    refetchInterval: (query) => {
      const status = query.state.data?.indexStatus;
      return status === 'PENDING' || status === 'DESCRIBED' ? INDEX_POLL_MS : false;
    },
  });
}

function chunks<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) result.push(items.slice(i, i + size));
  return result;
}

// The API takes at most PHOTO_MAX_FILES per request: a 40-photo check-in = 4 requests, sent one after another
// (each is all-or-nothing on the API side). A failure stops the rest → UploadPartialError if some were stored.
export function useUploadConditionPhotos(apartmentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      files,
      event,
      takenOn,
      note,
    }: UploadConditionPhotosInput): Promise<ConditionPhotoUploadResult[]> => {
      const results: ConditionPhotoUploadResult[] = [];
      for (const chunk of chunks(files, PHOTO_MAX_FILES)) {
        try {
          const stored = unwrap(
            await api.POST('/apartments/{apartmentId}/condition-photos', {
              params: { path: { apartmentId } },
              // The schema types binary parts as string; the serializer sends the real Files as multipart.
              body: {
                files: chunk as unknown as string[],
                event,
                takenOn,
                note: note ?? undefined,
              },
              // FormData → the browser sets Content-Type with the multipart boundary.
              bodySerializer: () => {
                const formData = new FormData();
                for (const file of chunk) formData.append('files', file);
                formData.append('event', event);
                formData.append('takenOn', takenOn);
                if (note !== null) formData.append('note', note);
                return formData;
              },
            }),
          );
          results.push(...stored);
        } catch (error) {
          if (results.length === 0) throw error;
          throw new UploadPartialError(results.length, files.length, error);
        }
      }
      return results;
    },
    // Settled, not success: chunks stored before a failure are saved too.
    onSettled: () => void queryClient.invalidateQueries({ queryKey: conditionPhotoKeys.all }),
  });
}

export function useUpdateConditionPhoto(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: UpdateConditionPhotoInput) =>
      unwrap(await api.PATCH('/condition-photos/{id}', { params: { path: { id } }, body })),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: conditionPhotoKeys.all }),
  });
}

export function useDeleteConditionPhoto(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () =>
      unwrap(await api.DELETE('/condition-photos/{id}', { params: { path: { id } } })),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: conditionPhotoKeys.all }),
  });
}
