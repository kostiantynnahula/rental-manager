import { ApiProperty } from '@nestjs/swagger';
import { formatPeriod } from '../../common/helpers/period.js';
import { Zone } from '../../generated/prisma/enums.js';
import type { TariffPrice } from '../../generated/prisma/client.js';

export class TariffPriceResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: '2026-11', description: 'First month the price applies to' })
  effectiveFrom: string;

  @ApiProperty({ enum: Zone, enumName: 'Zone' })
  zone: Zone;

  @ApiProperty({ example: '4.3200', description: 'UAH, decimal string with 4 decimals' })
  price: string;

  @ApiProperty()
  createdAt: Date;

  static from(p: TariffPrice): TariffPriceResponseDto {
    return {
      id: p.id,
      effectiveFrom: formatPeriod(p.effectiveFrom),
      zone: p.zone,
      price: p.price.toFixed(4),
      createdAt: p.createdAt,
    };
  }
}
