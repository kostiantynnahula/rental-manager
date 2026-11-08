export type PhotoFilter = 'unassigned' | 'all';

// Tab filter, synced with ?photos=.
export const PHOTO_FILTERS: { value: PhotoFilter; label: string }[] = [
  { value: 'unassigned', label: 'Нерозібрані' },
  { value: 'all', label: 'Усі' },
];

// Left out of the URL.
export const DEFAULT_PHOTO_FILTER: PhotoFilter = 'unassigned';
