import { ApiProperty } from '@nestjs/swagger';
import type { ReadingHistoryPage } from '../interfaces/reading-history-page.interface.js';
import { ReadingHistoryItemResponseDto } from './reading-history-item-response.dto.js';

export class ReadingHistoryPageResponseDto {
  @ApiProperty({ type: [ReadingHistoryItemResponseDto] })
  items: ReadingHistoryItemResponseDto[];

  @ApiProperty({ description: 'Readings matching the filters (all pages)' })
  total: number;

  @ApiProperty({ description: '1-based' })
  page: number;

  @ApiProperty()
  pageSize: number;

  static from(p: ReadingHistoryPage): ReadingHistoryPageResponseDto {
    return {
      items: p.items.map((i) => ReadingHistoryItemResponseDto.from(i)),
      total: p.total,
      page: p.page,
      pageSize: p.pageSize,
    };
  }
}
