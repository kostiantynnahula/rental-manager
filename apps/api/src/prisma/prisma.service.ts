import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { Env } from '../config/env.validation.js';
import { PrismaClient } from '../generated/prisma/client.js';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(config: ConfigService<Env, true>) {
    // Prisma 7 talks to Postgres through a driver adapter (node-postgres pool).
    super({
      adapter: new PrismaPg({ connectionString: config.get('DATABASE_URL', { infer: true }) }),
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
      // With driver adapters connections are lazy, so run a query to fail fast if the DB is unreachable.
      await this.$queryRaw`SELECT 1`;
    } catch (error) {
      // Prisma's own error output is a dump of its minified runtime; replace it with a readable one.
      const e = error as {
        code?: string;
        meta?: { driverAdapterError?: { cause?: { kind?: string } } };
      };
      // e.g. DatabaseNotReachable, AuthenticationFailed, DatabaseDoesNotExist
      const reason = e.meta?.driverAdapterError?.cause?.kind ?? e.code ?? String(error);
      throw new Error(
        `Cannot connect to database (${reason}). Is Postgres running (pnpm infra:up) and DATABASE_URL correct?`,
        { cause: error },
      );
    }
    this.logger.log('Connected to database');
  }

  // Called on app.close() and on SIGTERM/SIGINT (main.ts enables shutdown hooks).
  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
