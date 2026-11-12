import type { Meter, Reading } from '../results-api.service.js';
import type { ResultAction } from './result-action.interface.js';

export interface SummaryApartment {
  id: string;
  name: string;
  // A lease covers today: zero electricity is then suspicious.
  hasLease: boolean;
}

// One reading of a summary, with what's needed to describe it.
export interface SummaryEntry {
  apartment: SummaryApartment;
  // null = not among the apartment's installed meters any more (removed since).
  meter: Meter | null;
  reading: Reading;
}

export interface SummaryButton {
  text: string;
  action: ResultAction;
}

export interface RenderedSummary {
  text: string;
  // Rows of buttons; empty = nothing left to do.
  buttons: SummaryButton[][];
}
