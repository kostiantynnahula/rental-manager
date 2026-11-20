// ?q= as a plain string ('' when missing).
export function parseQuery(value: string | null): string {
  return value ?? '';
}
