import type { ConditionPhotoRoom } from '../../condition-photos/constants/condition-photo-description.js';
import type { ConditionPhotoDescription } from '../../condition-photos/interfaces/condition-photo-description.interface.js';
import { formatDateOnly } from '../../common/helpers/date-only.js';
import type { ConditionPhoto } from '../../generated/prisma/client.js';
import type { ChatPhotoFact } from '../interfaces/chat-photo-fact.interface.js';

export function toPhotoFact(photo: ConditionPhoto): ChatPhotoFact {
  // Only ever written from a validated DTO.
  const description = photo.description as unknown as ConditionPhotoDescription | null;
  return {
    photoId: photo.id,
    event: photo.event,
    takenOn: formatDateOnly(photo.takenOn),
    room: description?.room ?? null,
    summary: description?.summary ?? null,
    items: description?.items ?? [],
    note: photo.note,
  };
}

// By room, in the order rooms first appear; undescribed photos under "UNKNOWN".
export function groupByRoom(
  facts: ChatPhotoFact[],
): { room: ConditionPhotoRoom | 'UNKNOWN'; photos: ChatPhotoFact[] }[] {
  const rooms = new Map<ConditionPhotoRoom | 'UNKNOWN', ChatPhotoFact[]>();
  for (const fact of facts) {
    const room = fact.room ?? 'UNKNOWN';
    rooms.set(room, [...(rooms.get(room) ?? []), fact]);
  }
  return [...rooms].map(([room, photos]) => ({ room, photos }));
}
