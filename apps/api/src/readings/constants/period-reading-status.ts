// Status of a meter for one period in GET /apartments/:id/readings.
export const PeriodReadingStatus = {
  MISSING: 'MISSING',
  DRAFT: 'DRAFT',
  CONFIRMED: 'CONFIRMED',
} as const;

export type PeriodReadingStatus = (typeof PeriodReadingStatus)[keyof typeof PeriodReadingStatus];
