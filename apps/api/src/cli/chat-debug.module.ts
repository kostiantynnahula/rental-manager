import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ConditionPhotosModule } from '../condition-photos/condition-photos.module.js';
import { configModuleOptions } from '../config/config-module-options.js';
import { LeasesModule } from '../leases/leases.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';

// chat:debug only: the agent's tools need ConditionPhotosService, whose module brings the queues (Redis at
// startup), so it stays out of CliModule (the other CLIs don't need Redis running).
@Module({
  imports: [
    ConfigModule.forRoot(configModuleOptions),
    PrismaModule,
    ConditionPhotosModule,
    LeasesModule,
  ],
})
export class ChatDebugModule {}
