import { Module } from '@nestjs/common';
import { PhotoExtractorService } from './photo-extractor.service.js';

// Photo → proposed readings (LangChain vision call). Needs the global ConfigModule.
@Module({
  providers: [PhotoExtractorService],
  exports: [PhotoExtractorService],
})
export class ExtractionModule {}
