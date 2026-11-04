export interface StatementLease {
  id: string;
  startDate: Date;
  // Inclusive last day; null = open-ended.
  endDate: Date | null;
  // Integer kopiyky.
  monthlyRent: number;
}
