// Measure the semantic search (condition photos) on hand-labelled cases: recall@5, recall@10 and MRR, per case and
// overall. Manual and paid — one Voyage query call per case; reads the DB, writes nothing. Run from the repo root:
//   pnpm --filter api eval:search [-- <file>]     (default eval/search-cases.json, relative to apps/api)
// The file holds real ids, so it is gitignored; the format is in eval/search-cases.example.json. Uses the route's own
// ConditionPhotoIndexService.search (same model, filters, INDEXED only) at limit 10. Exit code 1 if a case failed or
// was skipped.
import { readFile } from 'node:fs/promises';
import { NestFactory } from '@nestjs/core';
import { ConditionPhotoIndexService } from '../condition-photos/condition-photo-index.service.js';
import { ConditionPhotoIndexStatus } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CliModule } from './cli.module.js';
import { parseSearchCases } from './helpers/parse-search-cases.js';
import { caseMetrics, mean } from './helpers/retrieval-metrics.js';
import type { CaseMetrics } from './interfaces/case-metrics.interface.js';
import type { SearchCase } from './interfaces/search-case.interface.js';

const DEFAULT_FILE = 'eval/search-cases.json';
const LIMIT = 10;

const fmt = (n: number) => n.toFixed(2);

// Why an expected photo can never be returned for this case (or null if it can).
type PhotoState = { apartmentId: string; event: string; indexStatus: string };
function unsearchable(c: SearchCase, photo: PhotoState | undefined): string | null {
  if (!photo) return 'not found';
  if (photo.apartmentId !== c.apartmentId) return 'another apartment';
  if (c.event && photo.event !== c.event) return `event ${photo.event}`;
  if (photo.indexStatus !== ConditionPhotoIndexStatus.INDEXED) return photo.indexStatus;
  return null;
}

async function main(): Promise<void> {
  // pnpm may pass a literal `--` through before the script's own args.
  const [file = DEFAULT_FILE] = process.argv.slice(2).filter((a) => a !== '--');
  const cases = parseSearchCases(JSON.parse(await readFile(file, 'utf8')));

  const app = await NestFactory.createApplicationContext(CliModule, { logger: ['error', 'warn'] });
  const ran: CaseMetrics[] = [];
  let failed = 0;
  let skipped = 0;
  try {
    const index = app.get(ConditionPhotoIndexService);
    const photos = await app.get(PrismaService).conditionPhoto.findMany({
      where: { id: { in: [...new Set(cases.flatMap((c) => c.expected))] } },
      select: { id: true, apartmentId: true, event: true, indexStatus: true },
    });
    const byId = new Map(photos.map((p) => [p.id, p]));

    console.log(`${cases.length} cases from ${file}, top ${LIMIT}\n`);
    console.log('  R@5  R@10    RR  query');
    for (const c of cases) {
      const label = `${c.q}${c.event ? ` [${c.event}]` : ''}`;
      const warnings = c.expected.flatMap((id) => {
        const why = unsearchable(c, byId.get(id));
        return why ? [`    ⚠ ${id}: ${why}`] : [];
      });
      // Nothing it could find: a broken case, not bad retrieval — and no paid call for it.
      if (warnings.length === c.expected.length) {
        skipped++;
        console.log(`     —     —     —  ${label}  (skipped: no expected photo is searchable)`);
        warnings.forEach((w) => console.log(w));
        continue;
      }
      try {
        const hits = await index.search(c.apartmentId, { q: c.q, event: c.event, limit: LIMIT });
        const m = caseMetrics(
          hits.map((h) => h.photo.id),
          c.expected,
        );
        ran.push(m);
        const found = m.foundRanks.length ? `found at ${m.foundRanks.join(', ')}` : 'none found';
        const missed = m.missed ? `; missed ${m.missed}` : '';
        console.log(
          `  ${fmt(m.recallAt5)}  ${fmt(m.recallAt10)}  ${fmt(m.reciprocalRank)}  ${label}  (${found}${missed})`,
        );
      } catch (e) {
        failed++;
        console.log(`     —     —     —  ${label}  (error: ${(e as Error).message})`);
      }
      warnings.forEach((w) => console.log(w));
    }
  } finally {
    await app.close();
  }

  if (ran.length === 0) console.log('\nOverall: no case ran');
  else
    console.log(
      `\nOverall (${ran.length} cases): recall@5 ${fmt(mean(ran.map((m) => m.recallAt5)))}, ` +
        `recall@10 ${fmt(mean(ran.map((m) => m.recallAt10)))}, MRR ${fmt(mean(ran.map((m) => m.reciprocalRank)))}`,
    );
  // Left out of the means, so they neither inflate nor hide the result — but they make the run incomplete.
  if (failed || skipped) {
    console.log(`Not in the means: ${failed} failed, ${skipped} skipped`);
    process.exitCode = 1;
  }
}

try {
  await main();
} catch (error) {
  console.error((error as Error).message);
  process.exitCode = 1;
}
