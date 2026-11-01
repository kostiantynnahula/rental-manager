import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateApartmentDto {
  @ApiProperty({ example: 'Shevchenka 12/5', description: 'Short unique label' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'Kyiv, Shevchenka St 12, apt 5' })
  @IsString()
  @IsNotEmpty()
  address: string;

  // null clears the notes on PATCH (@IsOptional skips validation for null/undefined).
  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  notes?: string | null;
}
