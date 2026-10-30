import type { Meter } from '../../generated/prisma/client.js';
import type { PeriodReadingStatus } from '../constants/period-reading-status.js';
import type { ReadingWithConsumption } from './reading-with-consumption.interface.js';

export interface ApartmentMeterReading {
  meter: Meter;
  status: PeriodReadingStatus;
  entry: ReadingWithConsumption | null;
}
