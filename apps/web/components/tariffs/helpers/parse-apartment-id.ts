const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ?apartmentId= on /tariffs/new; anything else (hand-edited, old link) is ignored.
export function parseApartmentId(value: string | null): string | undefined {
  return value && UUID.test(value) ? value : undefined;
}
