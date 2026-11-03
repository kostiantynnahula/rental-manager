import { ApiProperty } from '@nestjs/swagger';
import { formatPeriod } from '../../common/helpers/period.js';
import { isAttachmentCurrent } from '../helpers/is-attachment-current.js';
import type { TariffWithPrices } from '../helpers/tariff-with-prices.js';

// An apartment the tariff is (or was) attached to — the "Квартири" block of the tariff page.
export class TariffApartmentResponseDto {
  @ApiProperty({ format: 'uuid', description: 'Attachment id' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  apartmentId: string;

  @ApiProperty({ example: 'Shevchenka 12/5' })
  apartmentName: string;

  @ApiProperty({ example: '2026-11', description: 'First billed month' })
  activeFrom: string;

  @ApiProperty({
    type: String,
    nullable: true,
    example: null,
    description: 'Last billed month (inclusive); null = ongoing',
  })
  activeTo: string | null;

  @ApiProperty({ description: 'Not ended before this month (planned ones count too)' })
  isCurrent: boolean;

  static from(a: TariffWithPrices['apartments'][number], period: Date): TariffApartmentResponseDto {
    return {
      id: a.id,
      apartmentId: a.apartment.id,
      apartmentName: a.apartment.name,
      activeFrom: formatPeriod(a.activeFrom),
      activeTo: a.activeTo ? formatPeriod(a.activeTo) : null,
      isCurrent: isAttachmentCurrent(a, period),
    };
  }
}
