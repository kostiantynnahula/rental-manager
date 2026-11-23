// Manual check of the condition photo descriptions on local photos — no API, queue or DB, but every photo is one
// paid model call. Usage (from the repo root): pnpm --filter worker describe:samples -- <dir>
// <dir>: the photos (.jpg/.jpeg/.png/.webp) and an optional expected.json (ConditionSampleExpectation[]); see
// apps/worker/samples.example/condition/. Real photos of the apartments stay out of git (samples/).
// Prints the descriptions themselves: a local tool (the job never logs them).
import { readdir, readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { ConditionPhotoDescriber } from '../condition-photos/condition-photo-describer.service.js';
import { DescribeSamplesModule } from './describe-samples.module.js';
import { formatDescription } from './helpers/format-description.js';
import { missingItems } from './helpers/missing-items.js';
import type { ConditionSampleExpectation } from './interfaces/condition-sample-expectation.interface.js';

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

async function readExpected(dir: string): Promise<ConditionSampleExpectation[]> {
  try {
    return JSON.parse(
      await readFile(join(dir, 'expected.json'), 'utf8'),
    ) as ConditionSampleExpectation[];
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw e;
  }
}

async function main(): Promise<void> {
  const dir = process.argv.slice(2).find((a) => !a.startsWith('--'));
  if (!dir) throw new Error('Usage: pnpm --filter worker describe:samples -- <dir>');
  const expected = await readExpected(dir);
  const files = (await readdir(dir))
    .filter((f) => IMAGE_EXTENSIONS.has(extname(f).toLowerCase()))
    .sort();
  if (files.length === 0) throw new Error(`No photos in ${dir}`);

  const app = await NestFactory.createApplicationContext(DescribeSamplesModule, {
    logger: ['error', 'warn'],
  });
  const describer = app.get(ConditionPhotoDescriber);
  let found = 0;
  let total = 0;
  try {
    for (const file of files) {
      const wanted = expected.filter((x) => x.file === file).flatMap((x) => x.items);
      const started = Date.now();
      try {
        const description = await describer.describe(await readFile(join(dir, file)));
        console.log(`\n${file} — ${description.room} · ${Date.now() - started} ms`);
        formatDescription(description).forEach((line) => console.log(line));
        if (wanted.length > 0) {
          const missing = missingItems(wanted, description.items);
          const count = wanted.filter((w) => w.trim()).length;
          total += count;
          found += count - missing.length;
          console.log(
            missing.length === 0 ? '  ✓ all expected items' : `  ✗ missing: ${missing.join(', ')}`,
          );
        }
      } catch (e) {
        console.log(`\n${file}\n  error: ${(e as Error).message}`);
        total += wanted.filter((w) => w.trim()).length;
      }
    }
  } finally {
    await app.close();
  }
  if (total > 0) console.log(`\nExpected items found: ${found}/${total}`);
}

await main();
