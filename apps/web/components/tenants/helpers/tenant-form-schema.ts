import { z } from 'zod';
import { parseMoney } from '@/lib/format';
import { normalizeUaPhone } from '@/lib/phone';
import { MAX_RENT_KOPIYKY, PHONE_HINT, TENANT_NAME_MAX } from '../constants/form';

const emailSchema = z.email();

// Optional "assign to an apartment" block (create only). `mode`/`leaseId` aren't typed by the user: the form sets
// them from the selected apartment's current lease. Lease fields are required only for a new lease.
const assignmentSchema = z
  .object({
    apartmentId: z.string(),
    mode: z.enum(['', 'NEW_LEASE', 'ADD_CONTACT']),
    leaseId: z.string(),
    startDate: z.string(),
    rent: z.string(),
    notes: z.string().trim(),
  })
  .superRefine((a, ctx) => {
    if (!a.apartmentId || a.mode !== 'NEW_LEASE') return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(a.startDate))
      ctx.addIssue({ code: 'custom', path: ['startDate'], message: 'Вкажіть дату початку' });
    const rent = parseMoney(a.rent);
    if (rent === null || rent <= 0)
      ctx.addIssue({ code: 'custom', path: ['rent'], message: 'Вкажіть суму, напр. 15000' });
    else if (rent > MAX_RENT_KOPIYKY)
      ctx.addIssue({ code: 'custom', path: ['rent'], message: 'Завелика сума' });
  });

// Values stay as typed (the phone in display form); onSubmit normalizes the phone with normalizeUaPhone.
export const tenantFormSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, 'Вкажіть ім’я')
    .max(TENANT_NAME_MAX, `Не більше ${TENANT_NAME_MAX} символів`),
  phone: z
    .string()
    .trim()
    .min(1, 'Вкажіть телефон')
    .refine((value) => normalizeUaPhone(value) !== null, PHONE_HINT),
  email: z
    .string()
    .trim()
    .refine((value) => value === '' || emailSchema.safeParse(value).success, 'Невірний email'),
  notes: z.string().trim(),
  assignment: assignmentSchema,
});

export type TenantFormValues = z.infer<typeof tenantFormSchema>;
export type AssignmentFormValues = TenantFormValues['assignment'];
