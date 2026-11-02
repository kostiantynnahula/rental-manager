// Where "back" from a lease page goes: the tenant it was opened from (?from=tenant&tenantId=…), otherwise the
// apartment's Договори tab (?from=apartment or nothing).
export interface LeaseOrigin {
  from: 'apartment' | 'tenant' | null;
  tenantId: string | null;
}

export function leaseBackTarget(
  origin: LeaseOrigin,
  apartmentId: string,
): { href: string; label: string } {
  if (origin.from === 'tenant' && origin.tenantId)
    return { href: `/tenants/${origin.tenantId}`, label: 'Мешканець' };
  return { href: `/apartments/${apartmentId}?tab=leases`, label: 'Квартира' };
}

// The same ?from / ?tenantId on links between lease pages (detail ↔ edit), so "back" still works after them.
export function originQuery(origin: LeaseOrigin): string {
  const params = new URLSearchParams();
  if (origin.from) params.set('from', origin.from);
  if (origin.tenantId) params.set('tenantId', origin.tenantId);
  const query = params.toString();
  return query ? `?${query}` : '';
}
