import type { Zone } from '../../generated/prisma/enums.js';

// What adding one zone's value from a photo does to the caller's open draft (pure; the service writes):
// create = no draft yet; add = the zone is still empty; noop = same zone from the same photo (a job retry);
// conflict = the zone is already filled from another photo (never overwritten).
export function draftValueAction(
  draft: { values: ReadonlyArray<{ zone: Zone; photoId: string | null }> } | null,
  zone: Zone,
  photoId: string,
): 'create' | 'add' | 'noop' | 'conflict' {
  if (!draft) return 'create';
  const existing = draft.values.find((v) => v.zone === zone);
  if (!existing) return 'add';
  return existing.photoId === photoId ? 'noop' : 'conflict';
}
