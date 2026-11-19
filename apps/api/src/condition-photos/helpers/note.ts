// The column is VARCHAR(500).
export const CONDITION_PHOTO_NOTE_MAX_LENGTH = 500;

// Blank = no note.
export function cleanNote(note: string | null | undefined): string | null {
  return note?.trim() || null;
}
