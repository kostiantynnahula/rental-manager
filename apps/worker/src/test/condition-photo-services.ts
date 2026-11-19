import { Logger } from '@nestjs/common';
import { fakeApi, type Routes } from '@rental/testing';
import { onTestFinished, vi } from 'vitest';
import type { paths } from '../api/schema.js';
import { WorkerApi } from '../api/worker-api.service.js';
import { ConditionDescriptionReporter } from '../condition-photos/condition-description-reporter.service.js';
import type { ConditionPhotoDescriber } from '../condition-photos/condition-photo-describer.service.js';
import { DescribeConditionPhotoProcessor } from '../condition-photos/describe-condition-photo.processor.js';
import { DescribeConditionPhotoService } from '../condition-photos/describe-condition-photo.service.js';
import type { ConditionPhotoDescription } from '../condition-photos/interfaces/condition-photo-description.interface.js';

export interface ConditionPhotoServicesOptions {
  routes?: Routes;
  // What the describer stub returns, or an Error it throws. Default: conditionDescription().
  description?: ConditionPhotoDescription | Error;
}

export function conditionDescription(
  overrides: Partial<ConditionPhotoDescription> = {},
): ConditionPhotoDescription {
  return {
    room: 'KITCHEN',
    items: [{ name: 'холодильник', condition: 'подряпина на дверцятах' }],
    summary: 'Кухня з холодильником.',
    ...overrides,
  };
}

// The one place that builds the condition-photo job services (plain `new`, no Nest container): a constructor change
// touches only this file. Nest's Logger is silenced; the spies are returned for assertions.
export function conditionPhotoServices({
  routes = {},
  description,
}: ConditionPhotoServicesOptions = {}) {
  const { api, requests } = fakeApi<paths>(routes);
  const describe = vi.fn(() =>
    description instanceof Error
      ? Promise.reject(description)
      : Promise.resolve(description ?? conditionDescription()),
  );
  const describer = { describe } as unknown as ConditionPhotoDescriber;

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
  const reporter = new ConditionDescriptionReporter(worker);
  const service = new DescribeConditionPhotoService(worker, describer);
  const processor = new DescribeConditionPhotoProcessor(service, reporter);
  return { requests, describe, logs, reporter, service, processor };
}
