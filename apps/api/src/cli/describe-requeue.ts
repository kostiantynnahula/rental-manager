// Describe condition photos again, e.g. after a change of the worker's prompt. Run from the repo root:
//   pnpm --filter api describe:requeue -- --apartment <id|name> | --all | --photo <id> [--photo <id>…]
// --apartment: see findApartment. --all: every apartment's photos, archived ones too. --photo: just these photos
// (one paid call each — e.g. to check a prompt change on one photo).
// Enqueues describe-condition-photo for every photo except PENDING ones (their upload job is still due — a second
// job would be a second paid call; a PENDING photo given by --photo is an error). indexStatus isn't reset here, but the worker's PUT sets DESCRIBED before the
// API embeds it: the photo is out of search until re-embedded (a Voyage failure → embed:backfill). Needs Redis (the API's
// REDIS_* env) and a running worker to do the work. Builds first (Nest DI needs decorator metadata).
import { parseArgs } from 'node:util';
import { NestFactory } from '@nestjs/core';
import { isUUID } from 'class-validator';
import { ConditionPhotoIndexStatus } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ConditionPhotoJobsService } from '../queue/condition-photo-jobs.service.js';
import { DescribeRequeueModule } from './describe-requeue.module.js';
import { findApartment } from './helpers/find-apartment.js';

const USAGE = `Usage:
  describe:requeue --apartment <id|name>
  describe:requeue --all
  describe:requeue --photo <id> [--photo <id>…]`;

type Target = { apartment: string } | { all: true } | { photoIds: string[] };

function parse(argv: string[]): Target {
  const { values } = parseArgs({
    args: argv,
    options: {
      apartment: { type: 'string' },
      all: { type: 'boolean' },
      photo: { type: 'string', multiple: true },
    },
  });
  const given = [values.apartment !== undefined, values.all === true, values.photo !== undefined];
  const count = given.filter(Boolean).length;
  if (count > 1) throw new Error(`Use only one of --apartment, --all, --photo.\n${USAGE}`);
  if (count === 0) throw new Error(`--apartment, --all or --photo is required.\n${USAGE}`);
  if (values.all) return { all: true };
  if (values.photo) {
    const bad = values.photo.find((id) => !isUUID(id));
    if (bad !== undefined) throw new Error(`--photo must be a uuid: "${bad}"`);
    return { photoIds: [...new Set(values.photo)] };
  }
  return { apartment: values.apartment! };
}

// --photo: every id must exist and be described before (or failed) — an explicit id never ends in "queued 0".
async function photosByIds(prisma: PrismaService, ids: string[]): Promise<{ id: string }[]> {
  const photos = await prisma.conditionPhoto.findMany({
    where: { id: { in: ids } },
    select: { id: true, indexStatus: true },
  });
  const byId = new Map(photos.map((p) => [p.id, p]));
  for (const id of ids) {
    const photo = byId.get(id);
    if (!photo) throw new Error(`No condition photo ${id}`);
    if (photo.indexStatus === ConditionPhotoIndexStatus.PENDING) {
      throw new Error(`${id} is still PENDING (its upload job is due)`);
    }
  }
  return ids.map((id) => ({ id }));
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
    let label: string;
    let photos: { id: string }[];
    if ('photoIds' in target) {
      label = 'photos';
      photos = await photosByIds(prisma, target.photoIds);
    } else {
      const apartment =
        'apartment' in target ? await findApartment(prisma, target.apartment) : undefined;
      label = apartment?.name ?? 'all apartments';
      photos = await prisma.conditionPhoto.findMany({
        where: {
          ...(apartment && { apartmentId: apartment.id }),
          indexStatus: { not: ConditionPhotoIndexStatus.PENDING },
        },
        select: { id: true },
        orderBy: [{ uploadedAt: 'asc' }, { id: 'asc' }],
      });
    }
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
