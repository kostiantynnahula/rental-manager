import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CancelReadingDto {
  @ApiProperty({ example: 'Typo in the day value', description: 'Stored in the reading note' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;
}
