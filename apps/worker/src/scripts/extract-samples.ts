// Manual check of the photo extraction on local sample photos — no API or DB writes, but every photo is one paid
// model call. Usage (from the repo root): pnpm --filter worker extract:samples -- <dir>
// <dir>: the photos (.jpg/.jpeg/.png/.webp), meters.json (ExtractionCandidate[]) and optional expected.json
// (SampleExpectation[]); see apps/worker/samples.example/. Samples hold real meters — keep them out of git (samples/).
import { readdir, readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { PhotoExtractorService } from '../extraction/photo-extractor.service.js';
import type { ExtractionCandidate } from '../extraction/interfaces/extraction-candidate.interface.js';
import type { ExtractedReading } from '../extraction/interfaces/extracted-reading.interface.js';
import { ExtractSamplesModule } from './extract-samples.module.js';
import { sameMeterValue } from './helpers/same-meter-value.js';
import type { SampleExpectation } from './interfaces/sample-expectation.interface.js';

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

async function readJson<T>(path: string, fallback?: T): Promise<T> {
  try {
    return JSON.parse(await readFile(path, 'utf8')) as T;
  } catch (e) {
    if (fallback !== undefined && (e as NodeJS.ErrnoException).code === 'ENOENT') return fallback;
    throw e;
  }
}

function formatReading(r: ExtractedReading, meters: ExtractionCandidate[]): string {
  const meter = meters.find((m) => m.id === r.meterId);
  const who = meter
    ? `${meter.utility} ${meter.serialNumber ?? meter.id}`
    : `? ${r.utility} serial=${r.serialNumber ?? '—'}`;
  const issues = r.issues.length > 0 ? `  [${r.issues.join('; ')}]` : '';
  return `  ${who} ${r.zone} = ${r.value} (${r.confidence})${issues}`;
}

function check(expected: SampleExpectation, readings: ExtractedReading[]): string {
  const found = readings.find(
    (r) =>
      r.zone === expected.zone &&
      (!expected.serialNumber || (r.serialNumber ?? '').startsWith(expected.serialNumber)),
  );
  const what = `${expected.serialNumber ?? ''} ${expected.zone} ${expected.value}`.trim();
  if (!found) return `  ✗ expected ${what}: not found`;
  return sameMeterValue(found.value, expected.value)
    ? `  ✓ ${what}`
    : `  ✗ expected ${what}, got ${found.value}`;
}

async function main(): Promise<void> {
  const dir = process.argv.slice(2).find((a) => a !== '--');
  if (!dir) throw new Error('Usage: pnpm --filter worker extract:samples -- <dir>');
  const meters = await readJson<ExtractionCandidate[]>(join(dir, 'meters.json'));
  const expected = await readJson<SampleExpectation[]>(join(dir, 'expected.json'), []);
  const files = (await readdir(dir))
    .filter((f) => IMAGE_EXTENSIONS.has(extname(f).toLowerCase()))
    .sort();
  if (files.length === 0) throw new Error(`No photos in ${dir}`);

  const app = await NestFactory.createApplicationContext(ExtractSamplesModule, {
    logger: ['error', 'warn', 'log'],
  });
  const extractor = app.get(PhotoExtractorService);
  let passed = 0;
  let total = 0;
  try {
    for (const file of files) {
      console.log(`\n${file}`);
      try {
        const result = await extractor.extract({ image: await readFile(join(dir, file)), meters });
        result.readings.forEach((r) => console.log(formatReading(r, meters)));
        if (result.readings.length === 0) console.log('  (no readings)');
        if (result.photoIssues.length > 0) console.log(`  photo: ${result.photoIssues.join('; ')}`);
        for (const e of expected.filter((x) => x.file === file)) {
          const line = check(e, result.readings);
          total += 1;
          if (line.startsWith('  ✓')) passed += 1;
          console.log(line);
        }
      } catch (e) {
        console.log(`  error: ${(e as Error).message}`);
        total += expected.filter((x) => x.file === file).length;
      }
    }
  } finally {
    await app.close();
  }
  if (total > 0) console.log(`\nGolden values: ${passed}/${total}`);
}

await main();
