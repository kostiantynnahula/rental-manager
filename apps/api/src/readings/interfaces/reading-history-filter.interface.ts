export interface ReadingHistoryFilter {
  apartmentId: string;
  // 1st day of the month, inclusive.
  from?: Date;
  to?: Date;
  meterIds?: string[];
}
