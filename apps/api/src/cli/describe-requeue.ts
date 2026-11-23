// Describe condition photos again, e.g. after a change of the worker's prompt. Run from the repo root:
//   pnpm --filter api describe:requeue -- --apartment <id|name> | --all
// --apartment: see findApartment. --all: every apartment's photos, archived ones too.
// Enqueues describe-condition-photo for every photo except PENDING ones (their upload job is still due — a second
// job would be a second paid call). indexStatus isn't reset here, but the worker's PUT sets DESCRIBED before the
// API embeds it: the photo is out of search until re-embedded (a Voyage failure → embed:backfill). Needs Redis (the API's
// REDIS_* env) and a running worker to do the work. Builds first (Nest DI needs decorator metadata).
import { parseArgs } from 'node:util';
import { NestFactory } from '@nestjs/core';
import { ConditionPhotoIndexStatus } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ConditionPhotoJobsService } from '../queue/condition-photo-jobs.service.js';
import { DescribeRequeueModule } from './describe-requeue.module.js';
import { findApartment } from './helpers/find-apartment.js';

const USAGE = `Usage:
  describe:requeue --apartment <id|name>
  describe:requeue --all`;

type Target = { apartment: string } | { all: true };

function parse(argv: string[]): Target {
  const { values } = parseArgs({
    args: argv,
    options: {
      apartment: { type: 'string' },
      all: { type: 'boolean' },
    },
  });
  if (values.apartment !== undefined && values.all) {
    throw new Error(`--apartment and --all can't be used together.\n${USAGE}`);
  }
  if (values.all) return { all: true };
  if (!values.apartment) throw new Error(`--apartment or --all is required.\n${USAGE}`);
  return { apartment: values.apartment };
}

async function main(): Promise<void> {
  // pnpm may pass a literal `--` through before the script's own args.
  const argv = process.argv.slice(2).filter((a, i) => !(i === 0 && a === '--'));
  const target = parse(argv);
  const app = await NestFactory.createApplicationContext(DescribeRequeueModule, {
    logger: ['error', 'warn'],
  });
  try {
    const prisma = app.get(PrismaService);
    const apartment =
      'apartment' in target ? await findApartment(prisma, target.apartment) : undefined;
    const label = apartment?.name ?? 'all apartments';
    const photos = await prisma.conditionPhoto.findMany({
      where: {
        ...(apartment && { apartmentId: apartment.id }),
        indexStatus: { not: ConditionPhotoIndexStatus.PENDING },
      },
      select: { id: true },
      orderBy: [{ uploadedAt: 'asc' }, { id: 'asc' }],
    });
    const jobs = app.get(ConditionPhotoJobsService);
    let queued = 0;
    try {
      // One by one: tens of photos, and a failure (Redis down) stops at once instead of N timeouts.
      for (const { id } of photos) {
        await jobs.enqueueRedescribe(id);
        queued++;
      }
    } finally {
      console.log(`${label}: queued ${queued} of ${photos.length} photo(s)`);
    }
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
