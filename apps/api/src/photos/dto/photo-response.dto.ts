import { ApiProperty } from '@nestjs/swagger';
import type { Photo } from '../../generated/prisma/client.js';
import { PhotoParseStatus } from '../../generated/prisma/enums.js';

// Storage keys stay internal: clients fetch the bytes through the API (auth + cache headers).
export class PhotoResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  apartmentId: string;

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

  @ApiProperty({ type: String, nullable: true })
  originalFilename: string | null;

  @ApiProperty({ format: 'uuid' })
  uploadedById: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({
    enum: PhotoParseStatus,
    enumName: 'PhotoParseStatus',
    nullable: true,
    description:
      "The worker's parse job: PENDING until it ends; null = never queued (older photos)",
  })
  parseStatus: PhotoParseStatus | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Why nothing was matched, or the error (worker text, for the owner)',
  })
  parseNote: string | null;

  @ApiProperty({ example: '/api/photos/3f1c…/file' })
  fileUrl: string;

  @ApiProperty({ example: '/api/photos/3f1c…/thumbnail' })
  thumbnailUrl: string;

  static from(p: Photo): PhotoResponseDto {
    return {
      id: p.id,
      apartmentId: p.apartmentId,
      mimeType: p.mimeType,
      size: p.size,
      sha256: p.sha256,
      width: p.width,
      height: p.height,
      originalFilename: p.originalFilename,
      uploadedById: p.uploadedById,
      createdAt: p.createdAt,
      parseStatus: p.parseStatus,
      parseNote: p.parseNote,
      fileUrl: `/api/photos/${p.id}/file`,
      thumbnailUrl: `/api/photos/${p.id}/thumbnail`,
    };
  }
}
