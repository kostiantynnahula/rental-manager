import { Injectable, Logger } from '@nestjs/common';
import { UnrecoverableError } from 'bullmq';
import type { components } from '../api/schema.js';
import { WorkerApi } from '../api/worker-api.service.js';
import { ExtractionNotConfiguredError } from '../extraction/errors/extraction-not-configured.error.js';
import { PhotoExtractorService } from '../extraction/photo-extractor.service.js';
import { describeMeter } from './helpers/describe-meter.js';
import { draftNote } from './helpers/draft-note.js';
import { inboxSummary } from './helpers/inbox-summary.js';
import { kyivDate } from './helpers/kyiv-date.js';
import { matchReadings } from './helpers/match-readings.js';
import { oneApartment } from './helpers/one-apartment.js';
import { plausibilityWarnings } from './helpers/plausibility-warnings.js';
import { ParseResultReporter } from './parse-result-reporter.service.js';

type Meter = components['schemas']['MeterResponseDto'];
type DraftValue = components['schemas']['CreateDraftValueDto'];

// One parse-photo job: photo + the apartment's installed meters → extraction → one draft value per matched zone
// (POST /meters/{meterId}/draft-values; the API picks the draft). Inbox photo (no apartment): candidates = all
// active meters, matched by serial only, all in one apartment; the API assigns the photo on the first draft value. Unmatched readings create nothing — only a log
// line. Never logs the photo bytes, the prompt or the API key.
// A retry is safe: the same photo + zone again is a no-op on the API side (but it repeats the paid model call).
@Injectable()
export class ParsePhotoService {
  private readonly logger = new Logger(ParsePhotoService.name);

  constructor(
    private readonly api: WorkerApi,
    private readonly extractor: PhotoExtractorService,
    private readonly results: ParseResultReporter,
  ) {}

  async run(photoId: string): Promise<void> {
    const { apartmentId, mimeType, createdAt } = await this.api.getPhoto(photoId);
    const inbox = apartmentId === null;
    const where = inbox ? 'inbox' : `apartment ${apartmentId}`;

    // The apartment's installed meters, or every active meter (of active apartments) for an inbox photo.
    const meters =
      apartmentId === null
        ? await this.api.getActiveMeters()
        : await this.api.getApartmentMeters(apartmentId);
    if (meters.length === 0) {
      const why = inbox ? 'no active meters' : 'no installed meters';
      this.logger.warn(`photo ${photoId} (${where}): ${why}, nothing to read`);
      await this.results.report(photoId, 'NOT_MATCHED', why);
      return;
    }

    const image = await this.api.getPhotoFile(photoId);

    this.logger.log(
      `photo ${photoId} (${where}): ${image.byteLength} bytes ${mimeType}; ` +
        `${meters.length} meters:` +
        meters.map((m) => `\n  - ${describeMeter(m)}`).join(''),
    );

    const extraction = await this.extract(image, meters, inbox);
    if (extraction.photoIssues.length > 0) {
      this.logger.warn(`photo ${photoId}: ${extraction.photoIssues.join('; ')}`);
    }

    // The upload day (Kyiv) is when the tenant read the meter; the reading is for that month.
    const readingDate = kyivDate(new Date(createdAt));
    const period = readingDate.slice(0, 7);

    const lines: string[] = [];
    let posted = 0;
    const matched = matchReadings(extraction.readings, meters, { serialOnly: inbox });
    const matches = inbox ? oneApartment(matched) : matched;
    for (const match of matches) {
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
      const summary = inbox ? inboxSummary(matches) : null;
      const why = [...(summary ? [summary] : []), ...extraction.photoIssues, ...lines];
      await this.results.report(
        photoId,
        'NOT_MATCHED',
        why.length > 0 ? why.join('\n') : 'no readings',
      );
    }
  }

  private async extract(image: Buffer, meters: Meter[], inbox: boolean) {
    try {
      return await this.extractor.extract({ image, meters, inbox });
    } catch (e) {
      // Config problems won't fix themselves — and every retry would download the photo again.
      if (e instanceof ExtractionNotConfiguredError) throw new UnrecoverableError(e.message);
      throw e;
    }
  }

  // One zone into the key user's open draft. Returns what happened, for the summary log. Expected refusals
  // (the zone came from another photo, the meter was removed meanwhile, a 400) are logged, not job failures;
  // anything else throws in WorkerApi (5xx / network → retried).
  private async postDraftValue(meter: Meter, body: DraftValue): Promise<string> {
    const res = await this.api.postDraftValue(meter.id, body);
    if (res.ok) {
      return res.created
        ? `draft ${res.draftId} created`
        : `draft ${res.draftId} updated (or already had it)`;
    }
    const readingId = res.readingId !== undefined ? ` (draft ${res.readingId})` : '';
    return res.status === 409
      ? `not posted, 409 ${res.message}${readingId}`
      : `not posted, 400 ${res.message}`;
  }
}
