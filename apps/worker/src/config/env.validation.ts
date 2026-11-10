// Needed by class-transformer's implicit conversion; Nest loads it too, but this module must work standalone.
import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

export enum ExtractionProvider {
  Anthropic = 'anthropic',
}

export enum ExtractionEffort {
  Low = 'low',
  Medium = 'medium',
  High = 'high',
  XHigh = 'xhigh',
  Max = 'max',
}

export enum NodeEnv {
  Development = 'development',
  Test = 'test',
  Production = 'production',
}

// Every env var the worker reads must be declared here (and in the root .env.example).
export class Env {
  @IsEnum(NodeEnv)
  NODE_ENV: NodeEnv = NodeEnv.Development;

  // Includes the global prefix, e.g. http://localhost:3001/api (OpenAPI paths have no /api).
  @Matches(/^https?:\/\//, { message: 'API_BASE_URL must be an http(s):// URL' })
  API_BASE_URL: string;

  // API key of the worker's service user (`pnpm --filter api apikey:create ...`). Never log it.
  // The message must not echo the value.
  @Matches(/^rm_/, { message: 'API_KEY must be an API key (rm_…)' })
  API_KEY: string;

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

  // Photo extraction (src/extraction/). Optional: the worker starts without a key; extracting then fails clearly.
  // Never log it. The message must not echo the value.
  @IsOptional()
  @Matches(/^sk-ant-/, { message: 'ANTHROPIC_API_KEY must be an Anthropic API key (sk-ant-…)' })
  ANTHROPIC_API_KEY?: string;

  @IsEnum(ExtractionProvider)
  EXTRACTION_PROVIDER: ExtractionProvider = ExtractionProvider.Anthropic;

  @IsString()
  @MinLength(1)
  EXTRACTION_MODEL: string = 'claude-sonnet-5-5';

  @IsEnum(ExtractionEffort)
  EXTRACTION_EFFORT: ExtractionEffort = ExtractionEffort.Medium;
}

// Used by ConfigModule: fails fast at startup with all invalid vars listed (names and rules, never values).
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
