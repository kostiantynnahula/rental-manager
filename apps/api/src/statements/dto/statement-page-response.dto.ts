import { ApiProperty } from '@nestjs/swagger';
import type { StatementPage } from '../interfaces/statement-page.interface.js';
import { StatementListItemResponseDto } from './statement-list-item-response.dto.js';

export class StatementPageResponseDto {
  @ApiProperty({ type: [StatementListItemResponseDto] })
  items: StatementListItemResponseDto[];

  @ApiProperty({ description: "The apartment's statements (all pages), cancelled included" })
  total: number;

  @ApiProperty({ description: '1-based' })
  page: number;

  @ApiProperty()
  pageSize: number;

  static from(p: StatementPage): StatementPageResponseDto {
    return {
      items: p.items.map((s) => StatementListItemResponseDto.from(s)),
      total: p.total,
      page: p.page,
      pageSize: p.pageSize,
    };
  }
}
