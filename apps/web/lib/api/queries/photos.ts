import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { unwrap } from '@/lib/api/errors';
import type { components } from '@/lib/api/schema';

export type Photo = components['schemas']['PhotoListItemResponseDto'];
export type PhotoUploadResult = components['schemas']['PhotoUploadResultDto'];

export const photoKeys = {
  all: ['photos'] as const,
  lists: () => [...photoKeys.all, 'list'] as const,
  list: (apartmentId: string, unassigned: boolean) =>
    [...photoKeys.lists(), apartmentId, { unassigned }] as const,
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
  return useQuery(photoListOptions(apartmentId, unassigned));
}

export function useUploadPhotos(apartmentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (files: File[]): Promise<PhotoUploadResult[]> =>
      unwrap(
        await api.POST('/apartments/{apartmentId}/photos', {
          params: { path: { apartmentId } },
          // The schema types binary parts as string; the serializer below sends the real Files as multipart.
          body: { files: files as unknown as string[] },
          // FormData → openapi-fetch leaves Content-Type to the browser (multipart boundary).
          bodySerializer: () => {
            const formData = new FormData();
            for (const file of files) formData.append('files', file);
            return formData;
          },
        }),
      ),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: photoKeys.lists() }),
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
