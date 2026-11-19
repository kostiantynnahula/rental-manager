import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PHOTO_MAX_FILES } from '@/components/photos/constants/upload';
import { api } from '@/lib/api/client';
import { unwrap } from '@/lib/api/errors';
import type { components } from '@/lib/api/schema';

export type ConditionPhoto = components['schemas']['ConditionPhotoResponseDto'];
export type ConditionPhotoEvent = components['schemas']['ConditionPhotoEvent'];
export type ConditionPhotoUploadResult = components['schemas']['ConditionPhotoUploadResultDto'];
export type UpdateConditionPhotoInput = components['schemas']['UpdateConditionPhotoDto'];

// Inclusive `takenOn` range ("YYYY-MM-DD"); a lease page passes its dates.
export interface ConditionPhotoRange {
  from?: string;
  to?: string;
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
  list: (apartmentId: string, range: ConditionPhotoRange) =>
    [...conditionPhotoKeys.lists(), apartmentId, range] as const,
};

// Newest `takenOn` first (API order).
export function useConditionPhotos(apartmentId: string, range: ConditionPhotoRange = {}) {
  return useQuery({
    queryKey: conditionPhotoKeys.list(apartmentId, range),
    queryFn: async (): Promise<ConditionPhoto[]> =>
      unwrap(
        await api.GET('/apartments/{apartmentId}/condition-photos', {
          params: { path: { apartmentId }, query: { from: range.from, to: range.to } },
        }),
      ),
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
    onSettled: () => void queryClient.invalidateQueries({ queryKey: conditionPhotoKeys.lists() }),
  });
}

export function useUpdateConditionPhoto(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: UpdateConditionPhotoInput) =>
      unwrap(await api.PATCH('/condition-photos/{id}', { params: { path: { id } }, body })),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: conditionPhotoKeys.lists() }),
  });
}

export function useDeleteConditionPhoto(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () =>
      unwrap(await api.DELETE('/condition-photos/{id}', { params: { path: { id } } })),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: conditionPhotoKeys.lists() }),
  });
}
