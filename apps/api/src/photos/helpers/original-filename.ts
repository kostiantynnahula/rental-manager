const MAX_LENGTH = 255;

// Metadata only (shown in the UI), never used in storage keys. Strips any client-side path.
export function cleanOriginalFilename(name: string | undefined): string | null {
  const base = name?.split(/[\\/]/).pop()?.trim();
  return base ? base.slice(0, MAX_LENGTH) : null;
}
