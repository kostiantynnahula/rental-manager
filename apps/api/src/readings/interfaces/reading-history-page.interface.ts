import type { ReadingHistoryItem } from './reading-history-item.interface.js';

export interface ReadingHistoryPage {
  items: ReadingHistoryItem[];
  total: number;
  page: number;
  pageSize: number;
}
