import type { Apartment } from '../../generated/prisma/client.js';
import type { LeaseWithTenants } from '../../leases/helpers/lease-with-tenants.js';

// Apartment with `leases` filtered to the current lease (at most one element).
export interface ApartmentWithCurrentLease extends Apartment {
  leases: LeaseWithTenants[];
}
