import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

// utility and zoneScheme are immutable: not listed, so forbidNonWhitelisted rejects them (400).
// Omitted = unchanged; null = clear.
export class UpdateMeterDto {
  @ApiPropertyOptional({ type: String, nullable: true, example: 'kitchen' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  label?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  serialNumber?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  notes?: string | null;
}
