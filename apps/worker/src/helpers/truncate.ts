// Cuts a text to an API field limit (an over-long value would be a 400): at most `max` characters, ending with
// "…" when cut. One helper for every limit the worker sends (notes, errors, description texts).
export function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}
