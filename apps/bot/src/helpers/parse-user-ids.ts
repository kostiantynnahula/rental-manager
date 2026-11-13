// "123, 456" → Set {123, 456}. The format is already checked by env validation.
export function parseUserIds(input: string): Set<number> {
  return new Set(
    input
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map(Number),
  );
}
