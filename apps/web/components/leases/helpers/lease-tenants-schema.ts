import { z } from 'zod';

// Same rules as the API (ExactlyOnePrimary, UniqueTenantIds); name/phone are kept only for display.
export const leaseTenantsSchema = z
  .array(
    z.object({
      tenantId: z.string(),
      fullName: z.string(),
      phone: z.string(),
      role: z.enum(['PRIMARY', 'CONTACT']),
    }),
  )
  .superRefine((tenants, ctx) => {
    if (tenants.length === 0) {
      ctx.addIssue({ code: 'custom', message: 'Додайте мешканця' });
      return;
    }
    if (new Set(tenants.map((t) => t.tenantId)).size !== tenants.length)
      ctx.addIssue({ code: 'custom', message: 'Мешканець доданий двічі' });
    if (tenants.filter((t) => t.role === 'PRIMARY').length !== 1)
      ctx.addIssue({ code: 'custom', message: 'Оберіть основного орендаря' });
  });

export type LeaseTenantValue = z.infer<typeof leaseTenantsSchema>[number];
