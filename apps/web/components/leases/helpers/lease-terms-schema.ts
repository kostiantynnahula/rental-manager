import { z } from 'zod';
import { MAX_MONEY_KOPIYKY, parseMoney } from '@/lib/format';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

// Native date inputs give "YYYY-MM-DD" or ''. Rent is typed in UAH and converted with parseMoney on submit.
export const leaseTermsShape = {
  startDate: z.string().regex(DATE, 'Вкажіть дату початку'),
  endDate: z.string().refine((v) => v === '' || DATE.test(v), 'Невірна дата'),
  rent: z.string(),
  notes: z.string().trim(),
};

type LeaseTermsShapeValues = { startDate: string; endDate: string; rent: string; notes: string };

// Cross-field rules, shared by the terms-only schema (edit) and the create schema (terms + tenants).
export function refineLeaseTerms(v: LeaseTermsShapeValues, ctx: z.RefinementCtx): void {
  // "YYYY-MM-DD" strings compare correctly as plain strings.
  if (v.endDate && DATE.test(v.startDate) && v.endDate < v.startDate)
    ctx.addIssue({ code: 'custom', path: ['endDate'], message: 'Не раніше дати початку' });
  const rent = parseMoney(v.rent);
  if (rent === null || rent <= 0)
    ctx.addIssue({ code: 'custom', path: ['rent'], message: 'Вкажіть суму, напр. 15000' });
  else if (rent > MAX_MONEY_KOPIYKY)
    ctx.addIssue({ code: 'custom', path: ['rent'], message: 'Завелика сума' });
}

export const leaseTermsSchema = z.object(leaseTermsShape).superRefine(refineLeaseTerms);

export type LeaseTermsValues = z.infer<typeof leaseTermsSchema>;
