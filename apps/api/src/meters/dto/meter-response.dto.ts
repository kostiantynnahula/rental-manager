import { ApiProperty } from '@nestjs/swagger';
import { formatDateOnly } from '../../common/helpers/date-only.js';
import { UtilityType, ZoneScheme } from '../../generated/prisma/enums.js';
import { ReadingSummaryResponseDto } from '../../readings/dto/reading-summary-response.dto.js';
import type { MeterWithFlags } from '../interfaces/meter-with-flags.interface.js';

export class MeterResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  apartmentId: string;

  @ApiProperty({ enum: UtilityType, enumName: 'UtilityType' })
  utility: UtilityType;

  @ApiProperty({ enum: ZoneScheme, enumName: 'ZoneScheme' })
  zoneScheme: ZoneScheme;

  @ApiProperty({ type: String, nullable: true, example: 'kitchen' })
  label: string | null;

  @ApiProperty({ type: String, nullable: true })
  serialNumber: string | null;

  @ApiProperty({ format: 'date', example: '2026-01-15' })
  installedAt: string;

  @ApiProperty({ type: String, format: 'date', nullable: true, description: 'null = installed' })
  removedAt: string | null;

  @ApiProperty({ type: String, nullable: true })
  notes: string | null;

  @ApiProperty({
    type: () => ReadingSummaryResponseDto,
    nullable: true,
    description: 'Latest CONFIRMED reading (FINAL for a removed meter)',
  })
  lastReading: ReadingSummaryResponseDto | null;

  @ApiProperty({
    description: 'Computed by the server: DELETE would succeed (no REGULAR/FINAL readings)',
  })
  canDelete: boolean;

  @ApiProperty({
    description:
      'Computed by the server: PUT initial-values would succeed (installed, no non-cancelled REGULAR readings)',
  })
  canEditInitialValues: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static from(m: MeterWithFlags): MeterResponseDto {
    const last = m.readings[0];
    return {
      id: m.id,
      apartmentId: m.apartmentId,
      utility: m.utility,
      zoneScheme: m.zoneScheme,
      label: m.label,
      serialNumber: m.serialNumber,
      installedAt: formatDateOnly(m.installedAt),
      removedAt: m.removedAt ? formatDateOnly(m.removedAt) : null,
      notes: m.notes,
      lastReading: last ? ReadingSummaryResponseDto.from(last) : null,
      canDelete: m.canDelete,
      canEditInitialValues: m.canEditInitialValues,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
    };
  }
}
