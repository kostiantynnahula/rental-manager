import type { TenantAssignmentInput } from '@/lib/api/queries/tenants';
import { parseMoney } from '@/lib/format';
import type { AssignmentFormValues } from './tenant-form-schema';

// Form block → API body. undefined = no apartment selected (or its lease not loaded yet: submit is disabled then).
// The mode is sent explicitly; the API only validates it.
export function toAssignmentInput(a: AssignmentFormValues): TenantAssignmentInput | undefined {
  if (!a.apartmentId) return undefined;
  if (a.mode === 'ADD_CONTACT') return { mode: 'ADD_CONTACT', leaseId: a.leaseId };
  if (a.mode !== 'NEW_LEASE') return undefined;
  const monthlyRent = parseMoney(a.rent);
  if (monthlyRent === null) return undefined; // the schema already rejected it
  return {
    mode: 'NEW_LEASE',
    apartmentId: a.apartmentId,
    startDate: a.startDate,
    monthlyRent,
    ...(a.notes && { notes: a.notes }),
  };
}
