import { ApiProperty } from '@nestjs/swagger';
import { PeriodReadingStatus } from '../constants/period-reading-status.js';
import type { ApartmentMeterReading } from '../interfaces/apartment-meter-reading.interface.js';
import { MeterSummaryResponseDto } from './meter-summary-response.dto.js';
import { ReadingResponseDto } from './reading-response.dto.js';

export class ApartmentMeterReadingResponseDto {
  @ApiProperty({ type: MeterSummaryResponseDto })
  meter: MeterSummaryResponseDto;

  @ApiProperty({
    enum: PeriodReadingStatus,
    enumName: 'PeriodReadingStatus',
    description: 'MISSING = no reading for this period yet',
  })
  status: PeriodReadingStatus;

  @ApiProperty({ type: () => ReadingResponseDto, nullable: true })
  reading: ReadingResponseDto | null;

  static from(item: ApartmentMeterReading): ApartmentMeterReadingResponseDto {
    return {
      meter: MeterSummaryResponseDto.from(item.meter),
      status: item.status,
      reading: item.entry ? ReadingResponseDto.from(item.entry) : null,
    };
  }
}
