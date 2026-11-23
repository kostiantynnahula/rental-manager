// Vector and rerank scores side by side for a condition-photo search, to pick the rerank threshold. Run from the
// repo root:
//   pnpm --filter api search:debug -- --apartment <id|name> [--event CHECK_IN] [--candidates 50] "<query>"
// --apartment: a uuid, or a case-insensitive part of the name matching exactly one apartment (an exact name wins).
// Builds first (Nest DI needs decorator metadata). Needs VOYAGE_API_KEY. No threshold: prints every candidate.
import { parseArgs } from 'node:util';
import { NestFactory } from '@nestjs/core';
import { isUUID } from 'class-validator';
import { SEARCH_QUERY_MAX_LENGTH } from '../condition-photos/constants/condition-photo-search.js';
import { ConditionPhotoIndexService } from '../condition-photos/condition-photo-index.service.js';
import { embeddingText } from '../condition-photos/helpers/embedding-text.js';
import type { ConditionPhotoDescription } from '../condition-photos/interfaces/condition-photo-description.interface.js';
import { formatDateOnly } from '../common/helpers/date-only.js';
import { RERANK_MAX_DOCUMENTS } from '../embeddings/constants/rerank-model.js';
import { RerankService } from '../embeddings/rerank.service.js';
import { ConditionPhotoEvent } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CliModule } from './cli.module.js';

const DEFAULT_CANDIDATES = 50;
const SUMMARY_MAX = 60;
const EVENTS = Object.values(ConditionPhotoEvent);

const USAGE = `Usage:
  search:debug --apartment <id|name> [--event ${EVENTS.join('|')}] [--candidates ${DEFAULT_CANDIDATES}] "<query>"`;

interface Args {
  apartment: string;
  event?: ConditionPhotoEvent;
  candidates: number;
  q: string;
}

function parse(argv: string[]): Args {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      apartment: { type: 'string' },
      event: { type: 'string' },
      candidates: { type: 'string' },
    },
  });
  const q = positionals.join(' ').trim();
  if (!values.apartment || !q) throw new Error(`--apartment and a query are required.\n${USAGE}`);
  if (q.length > SEARCH_QUERY_MAX_LENGTH) {
    throw new Error(
      `The query is longer than ${SEARCH_QUERY_MAX_LENGTH} characters (the route's limit)`,
    );
  }
  if (values.event && !EVENTS.includes(values.event as ConditionPhotoEvent)) {
    throw new Error(`--event must be one of ${EVENTS.join(', ')}`);
  }
  const candidates =
    values.candidates === undefined ? DEFAULT_CANDIDATES : Number(values.candidates);
  if (!Number.isInteger(candidates) || candidates < 1 || candidates > RERANK_MAX_DOCUMENTS) {
    throw new Error(`--candidates must be an integer 1..${RERANK_MAX_DOCUMENTS}`);
  }
  return {
    apartment: values.apartment,
    event: values.event as ConditionPhotoEvent | undefined,
    candidates,
    q,
  };
}

async function findApartment(
  prisma: PrismaService,
  ref: string,
): Promise<{ id: string; name: string }> {
  const select = { id: true, name: true };
  if (isUUID(ref)) {
    const apartment = await prisma.apartment.findUnique({ where: { id: ref }, select });
    if (!apartment) throw new Error(`No apartment with id ${ref}`);
    return apartment;
  }
  const matches = await prisma.apartment.findMany({
    where: { name: { contains: ref, mode: 'insensitive' } },
    select,
    orderBy: { name: 'asc' },
  });
  const exact = matches.find((a) => a.name.toLowerCase() === ref.toLowerCase());
  if (exact) return exact;
  if (matches.length === 1) return matches[0];
  if (matches.length === 0) throw new Error(`No apartment matches "${ref}"`);
  throw new Error(`"${ref}" matches several apartments: ${matches.map((a) => a.name).join(', ')}`);
}

function truncate(text: string, max: number): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

async function main(): Promise<void> {
  // pnpm may pass a literal `--` through before the script's own args.
  const argv = process.argv.slice(2).filter((a, i) => !(i === 0 && a === '--'));
  const args = parse(argv);
  const app = await NestFactory.createApplicationContext(CliModule, { logger: ['error', 'warn'] });
  try {
    const apartment = await findApartment(app.get(PrismaService), args.apartment);
    const hits = await app
      .get(ConditionPhotoIndexService)
      .candidates(apartment.id, { q: args.q, event: args.event }, args.candidates);
    console.log(`${apartment.name} — "${args.q}": ${hits.length} candidate(s)`);
    if (hits.length === 0) return;
    // Only INDEXED photos are candidates, and those always have a description.
    const descriptions = hits.map(
      ({ photo }) => photo.description as unknown as ConditionPhotoDescription,
    );
    const ranked = await app.get(RerankService).rerank(args.q, descriptions.map(embeddingText));
    console.table(
      ranked.map(({ index, score }, rank) => ({
        rank: rank + 1,
        rerank: score.toFixed(3),
        vector: hits[index].score.toFixed(3),
        event: hits[index].photo.event,
        takenOn: formatDateOnly(hits[index].photo.takenOn),
        room: descriptions[index].room,
        summary: truncate(descriptions[index].summary, SUMMARY_MAX),
        id: hits[index].photo.id,
      })),
    );
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
