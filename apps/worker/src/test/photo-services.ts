import { Logger } from '@nestjs/common';
import { fakeApi, type Routes } from '@rental/testing';
import { onTestFinished, vi } from 'vitest';
import type { paths } from '../api/schema.js';
import { WorkerApi } from '../api/worker-api.service.js';
import type { Extraction } from '../extraction/interfaces/extraction.interface.js';
import type { PhotoExtractorService } from '../extraction/photo-extractor.service.js';
import { ParsePhotoProcessor } from '../photos/parse-photo.processor.js';
import { ParsePhotoService } from '../photos/parse-photo.service.js';
import { ParseResultReporter } from '../photos/parse-result-reporter.service.js';

export interface PhotoServicesOptions {
  routes?: Routes;
  // What the extractor stub returns, or an Error it throws. Default: nothing read.
  extraction?: Extraction | Error;
}

// The one place that builds the photo-job services (plain `new`, no Nest container): a constructor change touches
// only this file. Nest's Logger is silenced; the spies are returned for assertions.
export function photoServices({ routes = {}, extraction }: PhotoServicesOptions = {}) {
  const { api, requests } = fakeApi<paths>(routes);
  const extract = vi.fn(() =>
    extraction instanceof Error
      ? Promise.reject(extraction)
      : Promise.resolve(extraction ?? { readings: [], photoIssues: [] }),
  );
  const extractor = { extract } as unknown as PhotoExtractorService;

  const logs = {
    log: vi.spyOn(Logger.prototype, 'log').mockImplementation(() => {}),
    warn: vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {}),
    error: vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {}),
  };
  onTestFinished(() => {
    logs.log.mockRestore();
    logs.warn.mockRestore();
    logs.error.mockRestore();
  });

  const worker = new WorkerApi(api);
  const reporter = new ParseResultReporter(worker);
  const service = new ParsePhotoService(worker, extractor, reporter);
  const processor = new ParsePhotoProcessor(service, reporter);
  return { requests, extract, logs, reporter, service, processor };
}
