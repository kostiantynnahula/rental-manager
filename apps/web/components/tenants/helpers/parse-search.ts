// ?search= as a plain string ('' when missing).
export function parseSearch(value: string | null): string {
  return value ?? '';
}
