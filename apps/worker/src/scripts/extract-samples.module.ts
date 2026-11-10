import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { configModuleOptions } from '../config/config-module-options.js';
import { ExtractionModule } from '../extraction/extraction.module.js';

// Slim context for scripts/extract-samples.ts: config + extraction only (no Redis, no queue, no API calls).
@Module({ imports: [ConfigModule.forRoot(configModuleOptions), ExtractionModule] })
export class ExtractSamplesModule {}
