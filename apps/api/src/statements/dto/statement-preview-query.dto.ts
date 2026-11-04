import { ApiProperty } from '@nestjs/swagger';
import { IsPeriod } from '../../common/validators/is-period.decorator.js';

export class StatementPreviewQueryDto {
  @ApiProperty({ example: '2026-10' })
  @IsPeriod()
  period: string;
}
