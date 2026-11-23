import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { configModuleOptions } from '../config/config-module-options.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { QueueModule } from '../queue/queue.module.js';

// describe:requeue only: the queues connect to Redis at startup, so they stay out of CliModule (the other CLIs
// don't need Redis running).
@Module({
  imports: [ConfigModule.forRoot(configModuleOptions), PrismaModule, QueueModule],
})
export class DescribeRequeueModule {}
