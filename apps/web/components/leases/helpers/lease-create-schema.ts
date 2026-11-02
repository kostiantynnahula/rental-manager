import { z } from 'zod';
import { leaseTenantsSchema } from './lease-tenants-schema';
import { leaseTermsShape, refineLeaseTerms } from './lease-terms-schema';

// New lease = terms + tenants, sent in one POST.
export const leaseCreateSchema = z
  .object({ ...leaseTermsShape, tenants: leaseTenantsSchema })
  .superRefine(refineLeaseTerms);

export type LeaseCreateValues = z.infer<typeof leaseCreateSchema>;
