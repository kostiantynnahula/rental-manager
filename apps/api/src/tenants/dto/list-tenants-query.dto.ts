import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ListTenantsQueryDto {
  @ApiPropertyOptional({
    description:
      'Substring of the name (case-insensitive) or phone digits in any format ("067123")',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}
