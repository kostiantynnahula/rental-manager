import { consumptionLimit } from '@rental/shared';
import { ReadingStatus, UtilityType } from '../../generated/prisma/enums.js';
import {
  historyValueWarnings,
  monthsSincePrevious,
} from '../../readings/helpers/history-value-warnings.js';
import { expectedZones, missingZones } from '../../readings/helpers/zones.js';
import type { BatchSummaryApartment } from '../interfaces/batch-summary-apartment.interface.js';
import type { BatchSummaryInput } from '../interfaces/batch-summary-input.interface.js';
import type { BatchSummaryReading } from '../interfaces/batch-summary-reading.interface.js';
import type { BatchSummaryValue } from '../interfaces/batch-summary-value.interface.js';
import type { BatchSummary } from '../interfaces/batch-summary.interface.js';
import type { BatchReading } from './batch-reading-include.js';

const UTILITY_ORDER: string[] = Object.values(UtilityType);

// Pure: the batch summary from the loaded data. Readings grouped by the meter's apartment (by name); inside by
// utility, label (none first), period. Consumption and the previous value come from the reading_consumption view
// (ReadingsService.consumptionRows), warnings from the history's rule (historyValueWarnings).
export function buildBatchSummary(input: BatchSummaryInput): BatchSummary {
  const byApartment = new Map<string, BatchSummaryApartment>();
  for (const reading of [...input.readings].sort(compareReadings)) {
    const { apartment } = reading.meter;
    const group = byApartment.get(apartment.id) ?? { apartment, readings: [] };
    group.readings.push(summaryReading(reading, input));
    byApartment.set(apartment.id, group);
  }
  return {
    batchId: input.batchId,
    photos: input.photos,
    apartments: [...byApartment.values()].sort((a, b) =>
      a.apartment.name.localeCompare(b.apartment.name, 'uk'),
    ),
  };
}

function summaryReading(reading: BatchReading, input: BatchSummaryInput): BatchSummaryReading {
  const { values, meter, ...rest } = reading;
  const { apartment, ...meterOnly } = meter;
  const leases = input.leases.filter((l) => l.apartmentId === apartment.id);
  const order = expectedZones(meter.zoneScheme);
  const summaryValues = [...values]
    .sort((a, b) => order.indexOf(a.zone) - order.indexOf(b.zone))
    .map((v): BatchSummaryValue => {
      const row = input.rows.find((r) => r.readingId === reading.id && r.zone === v.zone);
      const consumption = row?.consumption ?? null;
      const previousPeriod = row?.previousPeriod ?? null;
      const lowerThanPrevious = consumption?.isNegative() ?? false;
      // A lower value is a confirm error, not a consumption warning.
      const codes = lowerThanPrevious
        ? []
        : historyValueWarnings({
            utility: meter.utility,
            zone: v.zone,
            consumption,
            previousPeriod,
            period: reading.period,
            leases,
          });
      const months = monthsSincePrevious(previousPeriod, reading.period);
      return {
        zone: v.zone,
        value: v.value,
        photoId: v.photoId,
        previousValue: row?.previousValue ?? null,
        consumption,
        lowerThanPrevious,
        warnings: codes.map((code) => ({
          code,
          limit: code === 'ABOVE_LIMIT' ? consumptionLimit(meter.utility, v.zone) : null,
          months,
        })),
      };
    });
  const missing = missingZones(meter.zoneScheme, values);
  return {
    reading: rest,
    meter: meterOnly,
    canConfirm:
      reading.status === ReadingStatus.DRAFT &&
      missing.length === 0 &&
      !summaryValues.some((v) => v.lowerThanPrevious),
    missingZones: missing,
    values: summaryValues,
  };
}

function compareReadings(a: BatchReading, b: BatchReading): number {
  return (
    UTILITY_ORDER.indexOf(a.meter.utility) - UTILITY_ORDER.indexOf(b.meter.utility) ||
    (a.meter.label ?? '').localeCompare(b.meter.label ?? '', 'uk') ||
    a.period.getTime() - b.period.getTime() ||
    a.readingDate.getTime() - b.readingDate.getTime()
  );
}
