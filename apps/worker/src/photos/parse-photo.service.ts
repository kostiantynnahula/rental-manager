import { Inject, Injectable, Logger } from '@nestjs/common';
import { UnrecoverableError } from 'bullmq';
import { API_CLIENT, type ApiClient } from '../api/api-client.js';
import { apiError } from '../api/helpers/api-error.js';
import type { components } from '../api/schema.js';
import { ExtractionNotConfiguredError } from '../extraction/errors/extraction-not-configured.error.js';
import { PhotoExtractorService } from '../extraction/photo-extractor.service.js';
import { describeMeter } from './helpers/describe-meter.js';
import { draftNote } from './helpers/draft-note.js';
import { kyivDate } from './helpers/kyiv-date.js';
import { matchReadings } from './helpers/match-readings.js';
import { plausibilityWarnings } from './helpers/plausibility-warnings.js';
import { ParseResultReporter } from './parse-result-reporter.service.js';

type Meter = components['schemas']['MeterResponseDto'];
type DraftValue = components['schemas']['CreateDraftValueDto'];

// One parse-photo job: photo + the apartment's installed meters → extraction → one draft value per matched zone
// (POST /meters/{meterId}/draft-values; the API picks the draft). Unmatched readings create nothing — only a log
// line. Never logs the photo bytes, the prompt or the API key.
// A retry is safe: the same photo + zone again is a no-op on the API side (but it repeats the paid model call).
@Injectable()
export class ParsePhotoService {
  private readonly logger = new Logger(ParsePhotoService.name);

  constructor(
    @Inject(API_CLIENT) private readonly api: ApiClient,
    private readonly extractor: PhotoExtractorService,
    private readonly results: ParseResultReporter,
  ) {}

  async run(photoId: string): Promise<void> {
    const photo = await this.api.GET('/photos/{id}', { params: { path: { id: photoId } } });
    if (!photo.data) {
      if (photo.response.status === 404)
        throw new UnrecoverableError(`Photo ${photoId} was deleted`);
      throw apiError(`GET /photos/${photoId}`, photo.response, photo.error);
    }

    const { apartmentId, mimeType, createdAt } = photo.data;
    // Inbox photo (no apartment yet): nothing to match against until inbox mode (#57) or an apartment is assigned.
    if (apartmentId === null) {
      this.logger.warn(`photo ${photoId}: inbox photo (no apartment), not parsed`);
      await this.results.report(photoId, 'NOT_MATCHED', 'inbox photo: no apartment');
      return;
    }

    const meters = await this.api.GET('/apartments/{apartmentId}/meters', {
      params: { path: { apartmentId }, query: {} },
    });
    if (!meters.data) {
      throw apiError(`GET /apartments/${apartmentId}/meters`, meters.response, meters.error);
    }
    if (meters.data.length === 0) {
      this.logger.warn(
        `photo ${photoId} (apartment ${apartmentId}): no installed meters, nothing to read`,
      );
      await this.results.report(photoId, 'NOT_MATCHED', 'no installed meters');
      return;
    }

    const file = await this.api.GET('/photos/{id}/file', {
      params: { path: { id: photoId } },
      parseAs: 'arrayBuffer',
    });
    if (!file.data) throw apiError(`GET /photos/${photoId}/file`, file.response, file.error);

    this.logger.log(
      `photo ${photoId} (apartment ${apartmentId}): ${file.data.byteLength} bytes ${mimeType}; ` +
        `${meters.data.length} meters:` +
        meters.data.map((m) => `\n  - ${describeMeter(m)}`).join(''),
    );

    const extraction = await this.extract(Buffer.from(file.data), meters.data);
    if (extraction.photoIssues.length > 0) {
      this.logger.warn(`photo ${photoId}: ${extraction.photoIssues.join('; ')}`);
    }

    // The upload day (Kyiv) is when the tenant read the meter; the reading is for that month.
    const readingDate = kyivDate(new Date(createdAt));
    const period = readingDate.slice(0, 7);

    const lines: string[] = [];
    let posted = 0;
    for (const match of matchReadings(extraction.readings, meters.data)) {
      const r = match.reading;
      const what = `${r.utility} ${r.zone}=${r.value} (${r.confidence})`;
      if (!match.meter) {
        lines.push(`skip ${what}: ${match.skip}`);
        continue;
      }
      if (r.meterId !== null && r.meterId !== match.meter.id) {
        lines.push(
          `note ${what}: model matched meter ${r.meterId}, serial/utility gave ${match.meter.id}`,
        );
      }
      const note = draftNote(r, plausibilityWarnings(match.meter, r.zone, r.value, period));
      const outcome = await this.postDraftValue(match.meter, {
        period,
        readingDate,
        zone: r.zone,
        value: r.value,
        photoId,
        note,
      });
      if (outcome.startsWith('draft')) posted += 1;
      lines.push(`${what} → meter ${match.meter.id}: ${outcome}${note ? ` [${note}]` : ''}`);
    }

    this.logger.log(
      `photo ${photoId}: ${extraction.readings.length} readings, ${posted} posted` +
        lines.map((l) => `\n  - ${l}`).join(''),
    );
    // Not matched: the same lines as the log (why each reading was skipped / refused), or why the photo is unreadable.
    if (posted > 0) await this.results.report(photoId, 'PARSED');
    else {
      const why = [...extraction.photoIssues, ...lines];
      await this.results.report(
        photoId,
        'NOT_MATCHED',
        why.length > 0 ? why.join('\n') : 'no readings',
      );
    }
  }

  private async extract(image: Buffer, meters: Meter[]) {
    try {
      return await this.extractor.extract({ image, meters });
    } catch (e) {
      // Config problems won't fix themselves — and every retry would download the photo again.
      if (e instanceof ExtractionNotConfiguredError) throw new UnrecoverableError(e.message);
      throw e;
    }
  }

  // One zone into the key user's open draft. Returns what happened, for the summary log. Expected refusals
  // (the zone came from another photo, the meter was removed meanwhile, a 400) are logged, not job failures;
  // anything else throws (5xx / network → retried).
  private async postDraftValue(meter: Meter, body: DraftValue): Promise<string> {
    const res = await this.api.POST('/meters/{meterId}/draft-values', {
      params: { path: { meterId: meter.id } },
      body,
    });
    if (res.data) {
      return res.response.status === 201
        ? `draft ${res.data.id} created`
        : `draft ${res.data.id} updated (or already had it)`;
    }
    const error: unknown = res.error;
    const message =
      typeof error === 'object' && error !== null && 'message' in error
        ? String(error.message)
        : '';
    const status = res.response.status;
    if (status === 409) {
      const readingId =
        typeof error === 'object' && error !== null && 'readingId' in error
          ? ` (draft ${String(error.readingId)})`
          : '';
      return `not posted, 409 ${message}${readingId}`;
    }
    if (status === 400) return `not posted, 400 ${message}`;
    throw apiError(`POST /meters/${meter.id}/draft-values`, res.response, res.error);
  }
}
