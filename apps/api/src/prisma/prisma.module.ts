import { Global, Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { PrismaExceptionFilter } from './prisma-exception.filter.js';
import { PrismaService } from './prisma.service.js';

// Global: inject PrismaService anywhere without importing this module.
@Global()
@Module({
  providers: [
    PrismaService,
    // Registered here (not in main.ts) so e2e tests that import AppModule get it too.
    { provide: APP_FILTER, useClass: PrismaExceptionFilter },
  ],
  exports: [PrismaService],
})
export class PrismaModule {}
