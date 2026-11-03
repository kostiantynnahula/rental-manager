import { ApiProperty } from '@nestjs/swagger';
import type { TariffWithPrices } from '../helpers/tariff-with-prices.js';
import { TariffPriceResponseDto } from './tariff-price-response.dto.js';
import { TariffResponseDto } from './tariff-response.dto.js';

export class TariffDetailResponseDto extends TariffResponseDto {
  @ApiProperty({
    type: [TariffPriceResponseDto],
    description: 'Full price history: effectiveFrom DESC, then zone',
  })
  prices: TariffPriceResponseDto[];

  static fromWithHistory(t: TariffWithPrices, period: Date): TariffDetailResponseDto {
    return {
      ...TariffResponseDto.fromWithPrices(t, period),
      prices: t.prices.map((p) => TariffPriceResponseDto.from(p)),
    };
  }
}
