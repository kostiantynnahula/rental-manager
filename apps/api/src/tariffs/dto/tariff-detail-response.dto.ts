import { ApiProperty } from '@nestjs/swagger';
import type { TariffWithPrices } from '../helpers/tariff-with-prices.js';
import { TariffApartmentResponseDto } from './tariff-apartment-response.dto.js';
import { TariffPriceResponseDto } from './tariff-price-response.dto.js';
import { TariffResponseDto } from './tariff-response.dto.js';

export class TariffDetailResponseDto extends TariffResponseDto {
  @ApiProperty({
    type: [TariffPriceResponseDto],
    description: 'Full price history: effectiveFrom DESC, then zone',
  })
  prices: TariffPriceResponseDto[];

  @ApiProperty({
    type: [TariffApartmentResponseDto],
    description: 'All attachments, current and ended: activeFrom DESC',
  })
  apartments: TariffApartmentResponseDto[];

  static fromWithHistory(t: TariffWithPrices, period: Date): TariffDetailResponseDto {
    return {
      ...TariffResponseDto.fromWithPrices(t, period),
      prices: t.prices.map((p) => TariffPriceResponseDto.from(p)),
      apartments: t.apartments.map((a) => TariffApartmentResponseDto.from(a, period)),
    };
  }
}
