import { ApiProperty } from '@nestjs/swagger';
import type { TariffPage } from '../interfaces/tariff-page.interface.js';
import { TariffResponseDto } from './tariff-response.dto.js';

export class TariffPageResponseDto {
  @ApiProperty({ type: [TariffResponseDto] })
  items: TariffResponseDto[];

  @ApiProperty({ description: 'Tariffs matching the filters (all pages)' })
  total: number;

  @ApiProperty({ description: '1-based' })
  page: number;

  @ApiProperty()
  pageSize: number;

  static from(p: TariffPage, period: Date): TariffPageResponseDto {
    return {
      items: p.items.map((t) => TariffResponseDto.fromWithPrices(t, period)),
      total: p.total,
      page: p.page,
      pageSize: p.pageSize,
    };
  }
}
