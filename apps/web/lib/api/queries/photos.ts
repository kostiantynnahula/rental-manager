import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { unwrap } from '@/lib/api/errors';
import type { components } from '@/lib/api/schema';

export type Photo = components['schemas']['PhotoListItemResponseDto'];
export type PhotoUploadResult = components['schemas']['PhotoUploadResultDto'];
export type PhotoDetail = components['schemas']['PhotoDetailResponseDto'];
export type PhotoReading = components['schemas']['PhotoReadingResponseDto'];
export type PhotoParseStatus = components['schemas']['PhotoParseStatus'];

// Refetch every 5 s while the worker is parsing one of the photos (PENDING), then stop.
const PARSE_POLL_MS = 5000;
const pollWhilePending = (photos: ReadonlyArray<{ parseStatus: PhotoParseStatus | null }>) =>
  photos.some((p) => p.parseStatus === 'PENDING') ? PARSE_POLL_MS : false;

export const photoKeys = {
  all: ['photos'] as const,
  lists: () => [...photoKeys.all, 'list'] as const,
  list: (apartmentId: string, unassigned: boolean) =>
    [...photoKeys.lists(), apartmentId, { unassigned }] as const,
  // Under lists(): every list invalidation (upload, delete, readings) refreshes the inbox too.
  inbox: () => [...photoKeys.lists(), 'inbox'] as const,
  details: () => [...photoKeys.all, 'detail'] as const,
  detail: (id: string) => [...photoKeys.details(), id] as const,
};

function photoListOptions(apartmentId: string, unassigned: boolean) {
  return {
    queryKey: photoKeys.list(apartmentId, unassigned),
    queryFn: async (): Promise<Photo[]> =>
      unwrap(
        await api.GET('/apartments/{apartmentId}/photos', {
          params: { path: { apartmentId }, query: { unassigned: unassigned ? 'true' : 'false' } },
        }),
      ),
  };
}

export function useApartmentPhotos(apartmentId: string, unassigned: boolean) {
  return useQuery({
    ...photoListOptions(apartmentId, unassigned),
    refetchInterval: (query) => pollWhilePending(query.state.data ?? []),
  });
}

// For "Наступне фото": an up-to-date unassigned list on demand (staleTime 0 → refetched if the cache is stale,
// e.g. right after a reading invalidated it).
export function useFetchUnassignedPhotos(apartmentId: string) {
  const queryClient = useQueryClient();
  return () => queryClient.fetchQuery({ ...photoListOptions(apartmentId, true), staleTime: 0 });
}

// «Вхідні»: photos without an apartment (newest first); polls while one is PENDING. A photo the worker matched by
// serial gets an apartment and leaves this list on the next poll.
export function useInboxPhotos() {
  return useQuery({
    queryKey: photoKeys.inbox(),
    queryFn: async (): Promise<Photo[]> =>
      unwrap(await api.GET('/photos', { params: { query: { inbox: 'true' } } })),
    refetchInterval: (query) => pollWhilePending(query.state.data ?? []),
  });
}

export function usePhoto(id: string, { enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: photoKeys.detail(id),
    queryFn: async (): Promise<PhotoDetail> =>
      unwrap(await api.GET('/photos/{id}', { params: { path: { id } } })),
    enabled,
    refetchInterval: (query) => pollWhilePending(query.state.data ? [query.state.data] : []),
  });
}

// apartmentId null = upload to the inbox (POST /photos).
export function useUploadPhotos(apartmentId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (files: File[]): Promise<PhotoUploadResult[]> => {
      const multipart = {
        // The schema types binary parts as string; the serializer below sends the real Files as multipart.
        body: { files: files as unknown as string[] },
        // FormData → openapi-fetch leaves Content-Type to the browser (multipart boundary).
        bodySerializer: () => {
          const formData = new FormData();
          for (const file of files) formData.append('files', file);
          return formData;
        },
      };
      return unwrap(
        apartmentId === null
          ? await api.POST('/photos', multipart)
          : await api.POST('/apartments/{apartmentId}/photos', {
              params: { path: { apartmentId } },
              ...multipart,
            }),
      );
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: photoKeys.lists() }),
  });
}

// A human sorts a photo (e.g. an inbox photo the worker couldn't match) into an apartment; the API re-parses it.
export function useAssignPhotoApartment(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (apartmentId: string): Promise<PhotoDetail> =>
      unwrap(await api.PATCH('/photos/{id}', { params: { path: { id } }, body: { apartmentId } })),
    onSuccess: (photo) => {
      // The review screen checks photo.apartmentId: a cached inbox version (null) would show «Фото не знайдено».
      queryClient.setQueryData(photoKeys.detail(id), photo);
      void queryClient.invalidateQueries({ queryKey: photoKeys.lists() });
    },
  });
}

// Only unassigned photos can be deleted, so no reading changes: just the photo lists.
export function useDeletePhoto(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => unwrap(await api.DELETE('/photos/{id}', { params: { path: { id } } })),
    onSuccess: () => {
      // Remove, not invalidate: a refetch of the deleted photo would just 404.
      queryClient.removeQueries({ queryKey: photoKeys.detail(id) });
      void queryClient.invalidateQueries({ queryKey: photoKeys.lists() });
    },
  });
}
