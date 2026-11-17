import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

// Paginated API lists are walked up to PAGE_SIZE × MAX_PAGES items; `truncated` tells the model to narrow the range.
export const PAGE_SIZE = 50;
export const MAX_PAGES = 10;

interface Page<T> {
  items: T[];
  total: number;
}

type PageOutcome<T> = { ok: true; data: Page<T> } | { ok: false; result: CallToolResult };

// `stop(item)`: the list is sorted, and this item (and everything after it) is past the wanted range.
export async function collectPages<T>(
  fetchPage: (page: number) => Promise<PageOutcome<T>>,
  stop?: (item: T) => boolean,
): Promise<{ ok: true; items: T[]; truncated: boolean } | { ok: false; result: CallToolResult }> {
  const items: T[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const outcome = await fetchPage(page);
    if (!outcome.ok) return outcome;
    const { items: pageItems, total } = outcome.data;
    const stopAt = stop ? pageItems.findIndex(stop) : -1;
    if (stopAt >= 0)
      return { ok: true, items: [...items, ...pageItems.slice(0, stopAt)], truncated: false };
    items.push(...pageItems);
    if (page * PAGE_SIZE >= total || pageItems.length === 0)
      return { ok: true, items, truncated: false };
  }
  return { ok: true, items, truncated: true };
}
