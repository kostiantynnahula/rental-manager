// Needed by class-transformer's implicit conversion; Nest loads it too, but this module must work standalone.
import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

export enum NodeEnv {
  Development = 'development',
  Test = 'test',
  Production = 'production',
}

// Every env var the api reads must be declared here (and in the root .env.example).
export class Env {
  @IsEnum(NodeEnv)
  NODE_ENV: NodeEnv = NodeEnv.Development;

  @IsInt()
  @Min(1)
  @Max(65535)
  PORT: number = 3001;

  @Matches(/^postgres(ql)?:\/\//, { message: 'DATABASE_URL must be a postgresql:// URL' })
  DATABASE_URL: string;

  // Signs access-token JWTs. Generate with `openssl rand -base64 48`.
  @IsString()
  @MinLength(32)
  JWT_ACCESS_SECRET: string;

  @IsInt()
  @Min(1)
  JWT_ACCESS_TTL_SECONDS: number = 900;

  @IsInt()
  @Min(1)
  REFRESH_TOKEN_TTL_DAYS: number = 30;

  // Photo storage (S3 API). MinIO in dev: set the endpoint and path-style; real S3: omit S3_ENDPOINT.
  @IsOptional()
  @Matches(/^https?:\/\//, { message: 'S3_ENDPOINT must be an http(s):// URL' })
  S3_ENDPOINT?: string;

  @IsString()
  S3_REGION: string = 'us-east-1';

  @IsString()
  @MinLength(3)
  S3_BUCKET: string;

  @IsString()
  @MinLength(1)
  S3_ACCESS_KEY_ID: string;

  @IsString()
  @MinLength(1)
  S3_SECRET_ACCESS_KEY: string;

  // A string, not a boolean: implicit conversion would turn "false" into true.
  @IsIn(['true', 'false'])
  S3_FORCE_PATH_STYLE: 'true' | 'false' = 'false';

  @IsInt()
  @Min(1)
  @Max(50)
  PHOTO_MAX_FILES: number = 10;

  @IsInt()
  @Min(1)
  @Max(100)
  PHOTO_MAX_FILE_SIZE_MB: number = 15;

  // Redis for the BullMQ queues (docker compose `redis` in dev, no password there).
  @IsString()
  @MinLength(1)
  REDIS_HOST: string = 'localhost';

  @IsInt()
  @Min(1)
  @Max(65535)
  REDIS_PORT: number = 6379;

  @IsOptional()
  @IsString()
  REDIS_PASSWORD?: string;
}

// Used by ConfigModule: fails fast at startup with all invalid vars listed.
export function validateEnv(raw: Record<string, unknown>): Env {
  const env = plainToInstance(Env, raw, { enableImplicitConversion: true });
  const errors = validateSync(env);
  if (errors.length > 0) {
    const details = errors
      .map((e) => `  ${e.property}: ${Object.values(e.constraints ?? {}).join(', ')}`)
      .join('\n');
    throw new Error(`Invalid environment variables:\n${details}`);
  }
  return env;
}
