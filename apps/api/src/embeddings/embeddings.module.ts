import { Module } from '@nestjs/common';
import { EmbeddingsService } from './embeddings.service.js';
import { RerankService } from './rerank.service.js';

@Module({
  providers: [EmbeddingsService, RerankService],
  exports: [EmbeddingsService, RerankService],
})
export class EmbeddingsModule {}
