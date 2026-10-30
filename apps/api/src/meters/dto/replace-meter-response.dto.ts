import { ApiProperty } from '@nestjs/swagger';
import { MeterResponseDto } from './meter-response.dto.js';

export class ReplaceMeterResponseDto {
  @ApiProperty({ type: MeterResponseDto, description: 'Old meter, now with FINAL reading' })
  removed: MeterResponseDto;

  @ApiProperty({ type: MeterResponseDto, description: 'New meter with its INITIAL reading' })
  installed: MeterResponseDto;
}
