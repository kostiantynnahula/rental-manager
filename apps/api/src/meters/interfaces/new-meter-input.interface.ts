import type { UtilityType, ZoneScheme } from '../../generated/prisma/enums.js';
import type { ReadingValueInputDto } from '../../readings/dto/reading-value-input.dto.js';

// Everything needed to install a meter with its INITIAL reading (POST and replace).
export interface NewMeterInput {
  apartmentId: string;
  utility: UtilityType;
  zoneScheme: ZoneScheme;
  label?: string;
  serialNumber?: string;
  // "YYYY-MM-DD"
  installedAt: string;
  initialValues: ReadingValueInputDto[];
  userId: string;
}
