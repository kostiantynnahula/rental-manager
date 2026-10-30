import type { S3ClientConfig } from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';
import { Env } from '../../config/env.validation.js';

// The only place that knows about MinIO vs. S3: everything else talks to StorageService.
export function s3ClientConfigFromConfig(config: ConfigService<Env, true>): S3ClientConfig {
  return {
    region: config.get('S3_REGION', { infer: true }),
    endpoint: config.get('S3_ENDPOINT', { infer: true }) || undefined,
    forcePathStyle: config.get('S3_FORCE_PATH_STYLE', { infer: true }) === 'true',
    credentials: {
      accessKeyId: config.get('S3_ACCESS_KEY_ID', { infer: true }),
      secretAccessKey: config.get('S3_SECRET_ACCESS_KEY', { infer: true }),
    },
  };
}

export function storageBucketFromConfig(config: ConfigService<Env, true>): string {
  return config.get('S3_BUCKET', { infer: true });
}
