import type { SummaryButton } from './summary-button.interface.js';

// A summary message: plain text + inline keyboard rows.
export interface RenderedSummary {
  text: string;
  buttons: SummaryButton[][];
}
