// The column is VARCHAR(100).
export const CHAT_TITLE_MAX_LENGTH = 100;

// Blank = untitled.
export function cleanTitle(title: string | null): string | null {
  return title?.trim() || null;
}
