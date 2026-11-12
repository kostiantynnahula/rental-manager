import { Injectable } from '@nestjs/common';
import { InlineKeyboard } from 'grammy';
import { renderSummary } from './helpers/render-summary.js';
import type {
  RenderedSummary,
  SummaryApartment,
  SummaryEntry,
} from './interfaces/summary-entry.interface.js';
import { type Photo, ResultsApiService } from './results-api.service.js';
import { ResultsStateService } from './results-state.service.js';

export interface SummaryMessage {
  text: string;
  keyboard?: InlineKeyboard;
}

// Builds a summary message from the API's current state of the photos' readings — also after a tap, so the message
// never shows a stale status.
@Injectable()
export class SummaryService {
  constructor(
    private readonly api: ResultsApiService,
    private readonly state: ResultsStateService,
  ) {}

  async build(photos: Photo[]): Promise<SummaryMessage> {
    return this.toMessage(renderSummary(await this.entries(photos)));
  }

  async buildForIds(photoIds: string[]): Promise<SummaryMessage> {
    return this.build(await Promise.all(photoIds.map((id) => this.api.photo(id))));
  }

  private async entries(photos: Photo[]): Promise<SummaryEntry[]> {
    // A two-zone reading may come from two photos: once per reading.
    const readingIds = [...new Set(photos.flatMap((p) => p.readings.map((r) => r.id)))];
    const apartmentIds = [
      ...new Set(photos.flatMap((p) => (p.apartmentId ? [p.apartmentId] : []))),
    ];
    const [readings, meterLists, apartments] = await Promise.all([
      Promise.all(readingIds.map((id) => this.api.reading(id))),
      Promise.all(apartmentIds.map((id) => this.api.meters(id))),
      this.api.apartments(),
    ]);
    const meters = new Map(meterLists.flat().map((m) => [m.id, m]));
    const apartmentOfReading = new Map(
      photos.flatMap((p) => p.readings.map((r) => [r.id, p.apartmentId] as const)),
    );
    return readings.map((reading) => {
      const apartmentId = apartmentOfReading.get(reading.id) ?? '';
      const apartment = apartments.find((a) => a.id === apartmentId);
      const summaryApartment: SummaryApartment = {
        id: apartmentId,
        // Archived apartments aren't in the active list.
        name: apartment?.name ?? 'Квартира (в архіві)',
        hasLease: apartment?.currentLease != null,
      };
      return { apartment: summaryApartment, meter: meters.get(reading.meterId) ?? null, reading };
    });
  }

  private toMessage({ text, buttons }: RenderedSummary): SummaryMessage {
    if (buttons.length === 0) return { text };
    const keyboard = new InlineKeyboard();
    for (const row of buttons) {
      for (const b of row) keyboard.text(b.text, this.state.callbackData(b.action));
      keyboard.row();
    }
    return { text, keyboard };
  }
}
