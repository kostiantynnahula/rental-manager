// The API's per-file error ("files[2]: unsupported type …", PhotosService) → 2; anything else → null.
export function badFileIndex(message: string): number | null {
  const match = /^files\[(\d+)\]:/.exec(message);
  return match ? Number(match[1]) : null;
}
