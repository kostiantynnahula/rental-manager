import { ApiProperty } from '@nestjs/swagger';
import type { BatchConfirmRefusal } from '../interfaces/batch-confirm-refusal.interface.js';

export class PhotoBatchRefusalResponseDto {
  @ApiProperty({ format: 'uuid' })
  readingId: string;

  @ApiProperty({
    example: 'A confirmed reading for this period already exists — cancel it first',
    description: 'The confirm rule that refused it (as POST /readings/:id/confirm would answer)',
  })
  reason: string;

  static from(r: BatchConfirmRefusal): PhotoBatchRefusalResponseDto {
    return { readingId: r.readingId, reason: r.reason };
  }
}
