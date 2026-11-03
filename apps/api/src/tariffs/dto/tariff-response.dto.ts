import { ApiProperty } from '@nestjs/swagger';
import { TariffKind, UtilityType } from '../../generated/prisma/enums.js';
import { currentPrices } from '../helpers/price-for-period.js';
import type { TariffWithPrices } from '../helpers/tariff-with-prices.js';
import { TariffPriceResponseDto } from './tariff-price-response.dto.js';

export class TariffResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Електроенергія' })
  name: string;

  @ApiProperty({ enum: TariffKind, enumName: 'TariffKind' })
  kind: TariffKind;

  @ApiProperty({ enum: UtilityType, enumName: 'UtilityType', isArray: true })
  utilities: UtilityType[];

  @ApiProperty({ type: String, nullable: true })
  notes: string | null;

  @ApiProperty({ description: 'false = archived' })
  isActive: boolean;

  @ApiProperty({
    description:
      'Attached to at least one apartment: kind/utilities are fixed and the tariff can only be archived, not deleted',
  })
  inUse: boolean;

  @ApiProperty({
    type: [TariffPriceResponseDto],
    description:
      'Prices in effect this month, one per zone with its own price (empty if all start later)',
  })
  currentPrices: TariffPriceResponseDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static fromWithPrices(t: TariffWithPrices, period: Date): TariffResponseDto {
    return {
      id: t.id,
      name: t.name,
      kind: t.kind,
      utilities: t.utilities,
      notes: t.notes,
      isActive: t.isActive,
      inUse: t._count.apartments > 0,
      currentPrices: currentPrices(t.prices, period).map((p) => TariffPriceResponseDto.from(p)),
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    };
  }
}
