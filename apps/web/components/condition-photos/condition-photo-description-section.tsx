'use client';

import { useState } from 'react';
import type { ConditionPhotoDetail } from '@/lib/api/queries/condition-photos';
import { ConditionPhotoDescriptionForm } from './condition-photo-description-form';

// Remounts the editor with fresh defaults on a save, a restore, an edit made elsewhere, the worker's first
// description, or another photo (the page stays mounted, hidden, between photos) — but never while it has unsaved
// changes: the page polls while PENDING, and the worker's description arriving must not throw a draft away.
export function ConditionPhotoDescriptionSection({ photo }: { photo: ConditionPhotoDetail }) {
  const key = `${photo.id}:${photo.descriptionEditedAt ?? 'model'}:${photo.description === null}`;
  const [dirty, setDirty] = useState(false);
  const [formKey, setFormKey] = useState(key);
  const [formPhoto, setFormPhoto] = useState(photo);
  // Adjust state while rendering (React's pattern for state derived from props): follow the photo unless dirty.
  // Another photo always wins: a kept draft would be saved to the previous photo.
  const otherPhoto = formPhoto.id !== photo.id;
  if ((!dirty || otherPhoto) && (formKey !== key || formPhoto !== photo)) {
    setFormKey(key);
    setFormPhoto(photo);
    if (otherPhoto) setDirty(false);
  }

  return <ConditionPhotoDescriptionForm key={formKey} photo={formPhoto} onDirtyChange={setDirty} />;
}
