import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ApiClient } from '../api/api-client.js';
import { collectPages, PAGE_SIZE } from '../helpers/pages.js';
import { idSchema, periodSchema, readingKind, utility, zone } from '../helpers/schemas.js';
import { callApi, toolResult } from '../helpers/tool-result.js';

const NAME = 'get_reading_history';

// The API's limit (@ArrayMaxSize on meterIds).
const MAX_METER_IDS = 50;

export function registerGetReadingHistory(server: McpServer, api: ApiClient): void {
  server.registerTool(
    NAME,
    {
      title: 'Reading history',
      description:
        'Confirmed readings with consumption per zone, newest first, for a range of months. For one utility ' +
        '(e.g. "gas readings for the last half year") pass `utility`: it covers replaced (removed) meters too. ' +
        'Values are meter readings, not money. truncated = more exist: narrow the range. Read-only.',
      inputSchema: {
        apartmentId: idSchema.describe('From list_apartments'),
        from: periodSchema.optional().describe('First month, YYYY-MM (inclusive)'),
        to: periodSchema.optional().describe('Last month, YYYY-MM (inclusive)'),
        utility: utility.optional().describe('Only meters of this utility, removed ones included'),
        meterIds: z
          .array(idSchema)
          .max(MAX_METER_IDS)
          .optional()
          .describe(
            'Only these meters; prefer `utility` (get_apartment lists installed meters only)',
          ),
      },
      outputSchema: {
        items: z.array(
          z.object({
            meter: z.object({
              id: z.string(),
              utility,
              label: z.string().nullable(),
              serialNumber: z.string().nullable(),
              removed: z.boolean().describe('Replaced or removed since'),
            }),
            period: z.string(),
            readingDate: z.string(),
            kind: readingKind.describe('FINAL = last reading of a removed meter'),
            values: z.array(
              z.object({
                zone,
                value: z.string(),
                consumption: z.string().nullable(),
                warnings: z.array(z.enum(['ABOVE_LIMIT', 'ZERO_CONSUMPTION'])),
              }),
            ),
          }),
        ),
        total: z.number().describe('All matching readings, also those not returned'),
        truncated: z.boolean(),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ apartmentId, from, to, utility: wanted, meterIds }) => {
      // The API filters by meter id only: a utility → the ids of all its meters, removed ones included
      // (a replacement within the range leaves readings on the old meter).
      let ids = meterIds;
      if (wanted) {
        const meters = await callApi(NAME, () =>
          api.GET('/apartments/{apartmentId}/meters', {
            params: { path: { apartmentId }, query: { includeRemoved: 'true' } },
          }),
        );
        if (!meters.ok) return meters.result;
        ids = meters.data
          .filter((m) => m.utility === wanted && (!meterIds || meterIds.includes(m.id)))
          .map((m) => m.id)
          .slice(0, MAX_METER_IDS);
        if (ids.length === 0) return toolResult({ items: [], total: 0, truncated: false });
      }

      let total = 0;
      const pages = await collectPages(async (page) => {
        const result = await callApi(NAME, () =>
          api.GET('/apartments/{apartmentId}/readings/history', {
            params: {
              path: { apartmentId },
              query: { from, to, meterIds: ids, page, pageSize: PAGE_SIZE },
            },
          }),
        );
        if (result.ok) total = result.data.total;
        return result;
      });
      if (!pages.ok) return pages.result;
      return toolResult({
        items: pages.items.map((r) => ({
          meter: {
            id: r.meter.id,
            utility: r.meter.utility,
            label: r.meter.label ?? null,
            serialNumber: r.meter.serialNumber ?? null,
            removed: r.meter.removed,
          },
          period: r.period,
          readingDate: r.readingDate,
          kind: r.kind,
          values: r.values.map((v) => ({
            zone: v.zone,
            value: v.value,
            consumption: v.consumption ?? null,
            warnings: v.warnings,
          })),
        })),
        total,
        truncated: pages.truncated,
      });
    },
  );
}
