import { ConflictException } from '@nestjs/common';
import type { ConditionPhoto } from '../../generated/prisma/client.js';

// Dedup is global (sha256 unique): the same file in another apartment is a 409, not a second copy.
export function assertSameApartment(existing: ConditionPhoto, apartmentId: string): void {
  if (existing.apartmentId !== apartmentId) {
    throw new ConflictException('This photo was already uploaded for another apartment');
  }
}
