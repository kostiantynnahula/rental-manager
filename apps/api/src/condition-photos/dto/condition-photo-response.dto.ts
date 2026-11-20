import { ApiProperty } from '@nestjs/swagger';
import { formatDateOnly } from '../../common/helpers/date-only.js';
import type { ConditionPhoto } from '../../generated/prisma/client.js';
import { ConditionPhotoEvent, ConditionPhotoIndexStatus } from '../../generated/prisma/enums.js';
import { ConditionPhotoDescriptionDto } from './condition-photo-description.dto.js';

// Storage keys stay internal: clients fetch the bytes through the API (auth + cache headers).
export class ConditionPhotoResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  apartmentId: string;

  @ApiProperty({ enum: ConditionPhotoEvent, enumName: 'ConditionPhotoEvent' })
  event: ConditionPhotoEvent;

  @ApiProperty({ format: 'date', example: '2026-11-01' })
  takenOn: string;

  @ApiProperty({ type: String, nullable: true })
  note: string | null;

  @ApiProperty()
  uploadedAt: Date;

  @ApiProperty({ example: 'image/jpeg', description: 'Detected from the file content' })
  mimeType: string;

  @ApiProperty({ description: 'Bytes' })
  size: number;

  @ApiProperty({ example: 'e3b0c442…', description: 'SHA-256 of the original (hex)' })
  sha256: string;

  @ApiProperty({ description: 'As displayed (EXIF orientation applied)' })
  width: number;

  @ApiProperty()
  height: number;

  @ApiProperty({
    enum: ConditionPhotoIndexStatus,
    enumName: 'ConditionPhotoIndexStatus',
    description: 'PENDING on upload → DESCRIBED → INDEXED (searchable), or FAILED',
  })
  indexStatus: ConditionPhotoIndexStatus;

  // Json in the DB, but only ever written through the validated ConditionPhotoDescriptionDto (PUT description).
  @ApiProperty({
    type: () => ConditionPhotoDescriptionDto,
    nullable: true,
    description: "The worker's structured description; null until DESCRIBED",
  })
  description: ConditionPhotoDescriptionDto | null;

  @ApiProperty({ type: String, nullable: true, description: 'Why indexing failed' })
  indexNote: string | null;

  @ApiProperty({ example: '/api/condition-photos/3f1c…/file' })
  fileUrl: string;

  @ApiProperty({ example: '/api/condition-photos/3f1c…/thumbnail' })
  thumbnailUrl: string;

  static from(p: ConditionPhoto): ConditionPhotoResponseDto {
    return {
      id: p.id,
      apartmentId: p.apartmentId,
      event: p.event,
      takenOn: formatDateOnly(p.takenOn),
      note: p.note,
      uploadedAt: p.uploadedAt,
      mimeType: p.mimeType,
      size: p.size,
      sha256: p.sha256,
      width: p.width,
      height: p.height,
      indexStatus: p.indexStatus,
      description: p.description as unknown as ConditionPhotoDescriptionDto | null,
      indexNote: p.indexNote,
      fileUrl: `/api/condition-photos/${p.id}/file`,
      thumbnailUrl: `/api/condition-photos/${p.id}/thumbnail`,
    };
  }
}
