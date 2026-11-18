import type { ConditionPhoto } from '../../generated/prisma/client.js';
import type { LeaseWithTenants } from '../../leases/helpers/lease-with-tenants.js';

export interface ConditionPhotoDetail {
  photo: ConditionPhoto;
  // The lease covering takenOn, or null.
  lease: LeaseWithTenants | null;
}
