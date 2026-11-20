// Measure the semantic search (condition photos) on hand-labelled cases: recall@5, recall@10 and MRR, per case and
// overall. Manual and paid — one Voyage query call per case; reads the DB, writes nothing. Run from the repo root:
//   pnpm --filter api eval:search [-- <file>]     (default eval/search-cases.json, relative to apps/api)
// The file holds real ids, so it is gitignored; the format is in eval/search-cases.example.json. Uses the route's own
// ConditionPhotoIndexService.search (same model, filters, INDEXED only) at limit 10. Exit code 1 if a case failed or
// was skipped.
import { readFile } from 'node:fs/promises';
import { NestFactory } from '@nestjs/core';
import { ConditionPhotoIndexService } from '../condition-photos/condition-photo-index.service.js';
import { CliModule } from './cli.module.js';
import { parseSearchCases } from './helpers/parse-search-cases.js';
import { caseMetrics, mean } from './helpers/retrieval-metrics.js';
import { unsearchable } from './helpers/unsearchable.js';
import type { CaseMetrics } from './interfaces/case-metrics.interface.js';

const DEFAULT_FILE = 'eval/search-cases.json';
const LIMIT = 10;

const fmt = (n: number) => n.toFixed(2);

async function main(): Promise<void> {
  // pnpm may pass a literal `--` through before the script's own args.
  const [file = DEFAULT_FILE] = process.argv.slice(2).filter((a) => a !== '--');
  const cases = parseSearchCases(JSON.parse(await readFile(file, 'utf8')));

  const app = await NestFactory.createApplicationContext(CliModule, { logger: ['error', 'warn'] });
  const ran: CaseMetrics[] = [];
  let failed = 0;
  let skipped = 0;
  let partial = 0;
  try {
    const index = app.get(ConditionPhotoIndexService);
    const byId = await index.searchability([...new Set(cases.flatMap((c) => c.expected))]);

    console.log(`${cases.length} cases from ${file}, top ${LIMIT}\n`);
    console.log('  R@5  R@10    RR  query');
    for (const c of cases) {
      const label = `${c.q}${c.event ? ` [${c.event}]` : ''}`;
      const warnings: string[] = [];
      const searchable = c.expected.filter((id) => {
        const why = unsearchable(c, byId.get(id));
        if (why) warnings.push(`    ⚠ ${id}: ${why} — not counted`);
        return !why;
      });
      // Nothing it could find: a broken case, not bad retrieval — and no paid call for it.
      if (searchable.length === 0) {
        skipped++;
        console.log(`     —     —     —  ${label}  (skipped: no expected photo is searchable)`);
        warnings.forEach((w) => console.log(w));
        continue;
      }
      try {
        const hits = await index.search(c.apartmentId, { q: c.q, event: c.event, limit: LIMIT });
        // Over the searchable expected photos only: a labelling or indexing problem must not read as a miss.
        const m = caseMetrics(
          hits.map((h) => h.photo.id),
          searchable,
        );
        if (searchable.length < c.expected.length) partial++;
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
        `recall@10 ${fmt(mean(ran.map((m) => m.recallAt10)))}, MRR ${fmt(mean(ran.map((m) => m.reciprocalRank)))}` +
        (partial
          ? ` — ${partial} of them partial (unsearchable expected photos not counted, see ⚠)`
          : ''),
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
