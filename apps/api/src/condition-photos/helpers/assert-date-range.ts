import { BadRequestException } from '@nestjs/common';

// The list's and the search's from/to (both optional, inclusive). YYYY-MM-DD strings compare as dates.
export function assertDateRange({ from, to }: { from?: string; to?: string }): void {
  if (from && to && from > to) throw new BadRequestException('from must not be after to');
}
