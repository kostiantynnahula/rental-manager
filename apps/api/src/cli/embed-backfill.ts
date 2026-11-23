// Embed condition photos that have a description but no embedding of the current model (a model change), or are
// still DESCRIBED (a Voyage outage, also after a re-describe). Run from the repo root:
//   pnpm --filter api embed:backfill
// Builds first (Nest DI needs decorator metadata). Needs VOYAGE_API_KEY. Exit code 1 if any photo failed.
import { NestFactory } from '@nestjs/core';
import { ConditionPhotoIndexService } from '../condition-photos/condition-photo-index.service.js';
import { CliModule } from './cli.module.js';

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(CliModule, { logger: ['error', 'warn'] });
  try {
    const { total, indexed, failed } = await app.get(ConditionPhotoIndexService).backfill();
    console.log(`To embed: ${total}, indexed: ${indexed}, failed: ${failed}`);
    if (failed > 0) process.exitCode = 1;
  } finally {
    await app.close();
  }
}

try {
  await main();
} catch (error) {
  console.error((error as Error).message);
  process.exitCode = 1;
}
