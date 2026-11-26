// The column is VARCHAR(100).
export const CHAT_TITLE_MAX_LENGTH = 100;

// Blank = untitled.
export function cleanTitle(title: string | null): string | null {
  return title?.trim() || null;
}

// A title from the first question: whitespace collapsed, cut at a word boundary near `length` with "…".
export function titleFromQuestion(question: string, length: number): string {
  const text = question.replace(/\s+/g, ' ').trim();
  if (text.length <= length) return text;
  const cut = text.slice(0, length);
  const space = cut.lastIndexOf(' ');
  // No space in the second half (one long word): cut mid-word rather than leave a stub.
  return `${(space > length / 2 ? cut.slice(0, space) : cut).trimEnd()}…`;
}
