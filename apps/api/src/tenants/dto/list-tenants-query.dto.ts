import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ListTenantsQueryDto {
  @ApiPropertyOptional({ description: 'Substring of name or phone, case-insensitive' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}
