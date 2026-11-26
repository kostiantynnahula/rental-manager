export type AnswerSegment = { type: 'text'; text: string } | { type: 'photo'; photoId: string };

// The API's marker (api-chat.md → Sources); it already strips every id a tool didn't return in that run.
const MARKER = /\[\[photo:([^\]\s]+)\]\]/g;

// "Кран [[photo:a]] тече" → text "Кран ", photo a, text " тече". Empty text between markers is dropped.
export function splitPhotoMarkers(text: string): AnswerSegment[] {
  const segments: AnswerSegment[] = [];
  let last = 0;
  for (const match of text.matchAll(MARKER)) {
    if (match.index > last) segments.push({ type: 'text', text: text.slice(last, match.index) });
    segments.push({ type: 'photo', photoId: match[1] });
    last = match.index + match[0].length;
  }
  if (last < text.length) segments.push({ type: 'text', text: text.slice(last) });
  return segments.filter((s) => s.type === 'photo' || s.text.trim() !== '');
}
