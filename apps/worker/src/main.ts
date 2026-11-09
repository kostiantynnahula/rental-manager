import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { WorkerModule } from './worker.module.js';

// No HTTP server: an application context only runs the BullMQ processors.
async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(WorkerModule);
  // Ctrl+C / SIGTERM: close the BullMQ worker (it finishes the current job first).
  app.enableShutdownHooks();
  new Logger('Worker').log('Waiting for jobs');
}
await bootstrap();
