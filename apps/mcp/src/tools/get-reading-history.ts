import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ApiClient } from '../api/api-client.js';
import { collectPages, PAGE_SIZE } from '../helpers/pages.js';
import { idSchema, periodSchema } from '../helpers/schemas.js';
import { callApi, toolResult } from '../helpers/tool-result.js';

const NAME = 'get_reading_history';

export function registerGetReadingHistory(server: McpServer, api: ApiClient): void {
  server.registerTool(
    NAME,
    {
      title: 'Reading history',
      description:
        'Confirmed readings with consumption per zone, newest first, for a range of months (e.g. "gas readings ' +
        'for the last half year": get the gas meter id from get_apartment, pass it in meterIds). Values are ' +
        'meter readings, not money. truncated = more exist: narrow the range. Read-only.',
      inputSchema: {
        apartmentId: idSchema.describe('From list_apartments'),
        from: periodSchema.optional().describe('First month, YYYY-MM (inclusive)'),
        to: periodSchema.optional().describe('Last month, YYYY-MM (inclusive)'),
        meterIds: z
          .array(idSchema)
          .optional()
          .describe('Only these meters (ids from get_apartment)'),
      },
      outputSchema: {
        items: z.array(
          z.object({
            meter: z.object({
              id: z.string(),
              utility: z.string(),
              label: z.string().nullable(),
              serialNumber: z.string().nullable(),
              removed: z.boolean(),
            }),
            period: z.string(),
            readingDate: z.string(),
            kind: z.string(),
            values: z.array(
              z.object({
                zone: z.string(),
                value: z.string(),
                consumption: z.string().nullable(),
                warnings: z.array(z.string()),
              }),
            ),
          }),
        ),
        total: z.number().describe('All matching readings, also those not returned'),
        truncated: z.boolean(),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ apartmentId, from, to, meterIds }) => {
      let total = 0;
      const pages = await collectPages(async (page) => {
        const result = await callApi(NAME, () =>
          api.GET('/apartments/{apartmentId}/readings/history', {
            params: {
              path: { apartmentId },
              query: { from, to, meterIds, page, pageSize: PAGE_SIZE },
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
