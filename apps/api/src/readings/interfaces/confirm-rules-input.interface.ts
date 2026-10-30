import type { ZoneScheme } from '../../generated/prisma/enums.js';
import type { ChronoReading } from './chrono-reading.interface.js';
import type { ConfirmCandidate } from './confirm-candidate.interface.js';

export interface ConfirmRulesInput {
  meter: { zoneScheme: ZoneScheme; installedAt: Date; removedAt: Date | null };
  candidate: ConfirmCandidate;
  // All CONFIRMED readings of the meter (any kind), with values.
  confirmed: ReadonlyArray<ChronoReading>;
  // Passed in (Kyiv "today"), so the rules stay pure and testable with a fixed date.
  today: Date;
}
