import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { PG_INT_MAX } from '../../common/constants/pg-limits.js';
import { IsPeriod } from '../../common/validators/is-period.decorator.js';
import {
  STATEMENT_LIST_DEFAULT_PAGE_SIZE,
  STATEMENT_LIST_PAGE_SIZES,
  type StatementListPageSize,
} from '../constants/statement-list.js';

export class ListStatementsQueryDto {
  @ApiPropertyOptional({ example: '2026-10', description: 'Only this month (YYYY-MM)' })
  @IsOptional()
  @IsPeriod()
  period?: string;

  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(PG_INT_MAX)
  page: number = 1;

  @ApiPropertyOptional({
    enum: STATEMENT_LIST_PAGE_SIZES,
    default: STATEMENT_LIST_DEFAULT_PAGE_SIZE,
  })
  @IsOptional()
  @Type(() => Number)
  @IsIn(STATEMENT_LIST_PAGE_SIZES)
  pageSize: StatementListPageSize = STATEMENT_LIST_DEFAULT_PAGE_SIZE;
}
