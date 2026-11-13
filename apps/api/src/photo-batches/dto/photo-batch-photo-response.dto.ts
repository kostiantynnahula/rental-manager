import { ApiProperty } from '@nestjs/swagger';
import type { Photo } from '../../generated/prisma/client.js';
import { PhotoParseStatus } from '../../generated/prisma/enums.js';

export class PhotoBatchPhotoResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({
    enum: PhotoParseStatus,
    enumName: 'PhotoParseStatus',
    nullable: true,
    description: "The worker's parse job: PENDING until it ends",
  })
  parseStatus: PhotoParseStatus | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Why nothing was matched, or the error (worker text)',
  })
  parseNote: string | null;

  static from(p: Pick<Photo, 'id' | 'parseStatus' | 'parseNote'>): PhotoBatchPhotoResponseDto {
    return { id: p.id, parseStatus: p.parseStatus, parseNote: p.parseNote };
  }
}
