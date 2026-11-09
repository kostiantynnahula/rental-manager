import type { QueueOptions } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { Env } from '../../config/env.validation.js';

export function bullmqOptionsFromConfig(config: ConfigService<Env, true>): QueueOptions {
  return {
    connection: {
      host: config.get('REDIS_HOST', { infer: true }),
      port: config.get('REDIS_PORT', { infer: true }),
      password: config.get('REDIS_PASSWORD', { infer: true }) || undefined,
      // The API only produces jobs: a command sent while the connection is down errors instead of being
      // buffered in memory. (BullMQ still waits for the connection first; PhotoJobsService bounds that wait.)
      enableOfflineQueue: false,
    },
  };
}
