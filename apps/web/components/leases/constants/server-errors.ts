import type { FieldErrorRule } from '@/lib/api/api-error';
import { OVERLAP_MESSAGE } from './messages';

// Server errors on the terms fields; also used by the create form (its values contain the same fields).
export const LEASE_TERMS_SERVER_ERRORS: FieldErrorRule<{ startDate: string; endDate: string }>[] = [
  {
    status: 409,
    bodyIncludes: 'overlap',
    field: 'startDate',
    alsoFields: ['endDate'],
    message: OVERLAP_MESSAGE,
  },
  { status: 400, bodyIncludes: 'endDate', field: 'endDate', message: 'Не раніше дати початку' },
];
