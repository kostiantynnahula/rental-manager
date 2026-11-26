import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { unwrap } from '@/lib/api/errors';
import type { components } from '@/lib/api/schema';

export type ChatListItem = components['schemas']['ChatListItemDto'];
export type ChatDetail = components['schemas']['ChatDetailResponseDto'];
export type ChatStoredMessage = components['schemas']['ChatMessageResponseDto'];

export const chatKeys = {
  all: ['chats'] as const,
  lists: () => [...chatKeys.all, 'list'] as const,
  list: (apartmentId: string) => [...chatKeys.lists(), apartmentId] as const,
  details: () => [...chatKeys.all, 'detail'] as const,
  detail: (id: string) => [...chatKeys.details(), id] as const,
};

// Last active first (API order).
export function useChats(apartmentId: string) {
  return useQuery({
    queryKey: chatKeys.list(apartmentId),
    queryFn: async (): Promise<ChatListItem[]> =>
      unwrap(
        await api.GET('/apartments/{apartmentId}/chats', { params: { path: { apartmentId } } }),
      ),
  });
}

// The chat with its whole history (oldest first). Not `useChat`: that's the AI SDK hook that streams the answer.
export function useChatDetail(id: string) {
  return useQuery({
    queryKey: chatKeys.detail(id),
    queryFn: async (): Promise<ChatDetail> =>
      unwrap(await api.GET('/chats/{id}', { params: { path: { id } } })),
    // The live conversation is kept by useChat, and a refetch remounts it (ChatConversation): refreshed only by
    // explicit invalidations (onFinish, rename), never by time, focus or a reconnect mid-answer. An invalidated
    // query still refetches on the next mount, so reopening a chat shows its saved history.
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

export function useCreateChat(apartmentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () =>
      unwrap(
        await api.POST('/apartments/{apartmentId}/chats', { params: { path: { apartmentId } } }),
      ),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: chatKeys.lists() }),
  });
}

export function useRenameChat(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (title: string | null) =>
      unwrap(await api.PATCH('/chats/{id}', { params: { path: { id } }, body: { title } })),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: chatKeys.all }),
  });
}

export function useDeleteChat(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => unwrap(await api.DELETE('/chats/{id}', { params: { path: { id } } })),
    // The deleted chat's detail would 404 on refetch: drop it instead of invalidating it.
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: chatKeys.detail(id) });
      void queryClient.invalidateQueries({ queryKey: chatKeys.lists() });
    },
  });
}
