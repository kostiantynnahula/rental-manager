import { ApiProperty } from '@nestjs/swagger';
import { formatPeriod } from '../../common/helpers/period.js';
import type { ApartmentTariffWithTariff } from '../helpers/apartment-tariff-include.js';
import { isAttachmentCurrent } from '../helpers/is-attachment-current.js';
import { TariffResponseDto } from './tariff-response.dto.js';

// A tariff attached to an apartment for a range of months — the apartment's "Тарифи" tab.
export class ApartmentTariffResponseDto {
  @ApiProperty({ format: 'uuid', description: 'Attachment id' })
  id: string;

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

  @ApiProperty({ type: TariffResponseDto })
  tariff: TariffResponseDto;

  static fromWithTariff(a: ApartmentTariffWithTariff, period: Date): ApartmentTariffResponseDto {
    return {
      id: a.id,
      activeFrom: formatPeriod(a.activeFrom),
      activeTo: a.activeTo ? formatPeriod(a.activeTo) : null,
      isCurrent: isAttachmentCurrent(a, period),
      tariff: TariffResponseDto.fromWithPrices(a.tariff, period),
    };
  }
}
