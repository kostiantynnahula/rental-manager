import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ApiClient } from '../api/api-client.js';
import {
  idSchema,
  meterSummary,
  periodSchema,
  readingKind,
  toMeterSummary,
  zoneValue,
} from '../helpers/schemas.js';
import { callApi, toolResult } from '../helpers/tool-result.js';

const NAME = 'get_month_readings';

export function registerGetMonthReadings(server: McpServer, api: ApiClient): void {
  server.registerTool(
    NAME,
    {
      title: 'Readings of a month',
      description:
        'Every meter active in the month with its reading, or MISSING if none was sent yet ' +
        '("who has not sent readings"). DRAFT = not yet confirmed by the landlord. Values are meter readings ' +
        '(not money); consumption = since the previous confirmed reading. Read-only.',
      inputSchema: { apartmentId: idSchema.describe('From list_apartments'), period: periodSchema },
      outputSchema: {
        period: z.string(),
        meters: z.array(
          z.object({
            meter: meterSummary,
            status: z.enum(['MISSING', 'DRAFT', 'CONFIRMED']),
            reading: z
              .object({
                kind: readingKind,
                status: z.enum(['DRAFT', 'CONFIRMED', 'CANCELLED']),
                readingDate: z.string().describe('YYYY-MM-DD'),
                values: z.array(zoneValue.extend({ source: z.enum(['MANUAL', 'PHOTO']) })),
                consumption: z
                  .array(zoneValue)
                  .nullable()
                  .describe('Since the previous confirmed reading; null = none before'),
              })
              .nullable(),
          }),
        ),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ apartmentId, period }) => {
      const rows = await callApi(NAME, () =>
        api.GET('/apartments/{apartmentId}/readings', {
          params: { path: { apartmentId }, query: { period } },
        }),
      );
      if (!rows.ok) return rows.result;
      return toolResult({
        period,
        meters: rows.data.map(({ meter, status, reading }) => ({
          meter: toMeterSummary(meter),
          status,
          reading: reading
            ? {
                kind: reading.kind,
                status: reading.status,
                readingDate: reading.readingDate,
                values: reading.values.map((v) => ({
                  zone: v.zone,
                  value: v.value,
                  source: v.source,
                })),
                consumption:
                  reading.consumption?.map((c) => ({ zone: c.zone, value: c.value })) ?? null,
              }
            : null,
        })),
      });
    },
  );
}
