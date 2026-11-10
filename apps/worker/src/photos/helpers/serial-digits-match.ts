// Recognized serial vs a meter's stored one, digits only. Equal, or one is a prefix (cut off at the photo's edge:
// "8486065" vs "848606502415") or a suffix (a leading year: "202402006847" vs "02006847") of the other — only when
// the shorter has >= 6 digits, so a fragment can't match by chance.
const MIN_PARTIAL_DIGITS = 6;

export function serialDigitsMatch(recognized: string, stored: string): boolean {
  if (recognized === stored) return true;
  const [short, long] =
    recognized.length < stored.length ? [recognized, stored] : [stored, recognized];
  return short.length >= MIN_PARTIAL_DIGITS && (long.startsWith(short) || long.endsWith(short));
}
