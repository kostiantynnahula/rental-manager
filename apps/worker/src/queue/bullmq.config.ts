import type { QueueOptions } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { Env } from '../config/env.validation.js';

// BullMQ sets maxRetriesPerRequest: null for workers itself; the offline queue stays on, so the worker
// just waits while Redis is down.
export function bullmqOptionsFromConfig(config: ConfigService<Env, true>): QueueOptions {
  return {
    connection: {
      host: config.get('REDIS_HOST', { infer: true }),
      port: config.get('REDIS_PORT', { infer: true }),
      password: config.get('REDIS_PASSWORD', { infer: true }) || undefined,
    },
  };
}
