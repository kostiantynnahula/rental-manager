import { Module } from '@nestjs/common';
import { EmbeddingsModule } from '../embeddings/embeddings.module.js';
import { ConditionPhotoIndexService } from './condition-photo-index.service.js';

// Embeddings + search, apart from ConditionPhotosModule (Multer, S3, Redis) so the backfill CLI can import just this.
@Module({
  imports: [EmbeddingsModule],
  providers: [ConditionPhotoIndexService],
  exports: [ConditionPhotoIndexService],
})
export class ConditionPhotoIndexModule {}
