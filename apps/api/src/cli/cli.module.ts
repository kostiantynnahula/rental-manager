import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ApiKeysModule } from '../api-keys/api-keys.module.js';
import { configModuleOptions } from '../config/config-module-options.js';
import { PrismaModule } from '../prisma/prisma.module.js';

// Just what the CLI needs: no HTTP features, storage or JWT.
@Module({
  imports: [ConfigModule.forRoot(configModuleOptions), PrismaModule, ApiKeysModule],
})
export class CliModule {}
