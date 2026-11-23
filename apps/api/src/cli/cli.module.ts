import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ApiKeysModule } from '../api-keys/api-keys.module.js';
import { ConditionPhotoIndexModule } from '../condition-photos/condition-photo-index.module.js';
import { configModuleOptions } from '../config/config-module-options.js';
import { EmbeddingsModule } from '../embeddings/embeddings.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';

// Just what the CLI needs: no HTTP features, storage, queues or JWT.
@Module({
  imports: [
    ConfigModule.forRoot(configModuleOptions),
    PrismaModule,
    ApiKeysModule,
    ConditionPhotoIndexModule,
    EmbeddingsModule,
  ],
})
export class CliModule {}
