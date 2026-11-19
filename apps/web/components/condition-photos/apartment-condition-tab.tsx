'use client';

import type { Apartment } from '@/lib/api/queries/apartments';
import { ConditionPhotoTimeline } from './condition-photo-timeline';

// Apartment page, tab "Стан": the whole history. No lease here, so new photos default to "Зміна";
// check-in/check-out photos are usually added from the lease page.
export function ApartmentConditionTab({ apartment }: { apartment: Apartment }) {
  return (
    <ConditionPhotoTimeline
      apartmentId={apartment.id}
      canUpload={apartment.isActive}
      emptyText="Фото стану ще не завантажені"
    />
  );
}
