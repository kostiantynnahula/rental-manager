import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ApiClient } from '../api/api-client.js';
import {
  idSchema,
  meterSummary,
  tariffSummary,
  toMeterSummary,
  toTariffSummary,
  zoneValue,
} from '../helpers/schemas.js';
import { callApi, toolResult } from '../helpers/tool-result.js';

const NAME = 'get_apartment';

const meter = meterSummary.extend({
  installedAt: z.string().describe('YYYY-MM-DD'),
  lastReading: z
    .object({ period: z.string(), readingDate: z.string(), values: z.array(zoneValue) })
    .nullable()
    .describe('Last confirmed reading'),
});

export function registerGetApartment(server: McpServer, api: ApiClient): void {
  server.registerTool(
    NAME,
    {
      title: 'Get apartment',
      description:
        'One apartment with its installed meters (ids, utility, last confirmed reading) and current tariffs, ' +
        'including fixed monthly fees (kind FIXED). Use it to find meter ids (e.g. the gas meter) for ' +
        'get_reading_history. Money in UAH. Read-only.',
      inputSchema: { apartmentId: idSchema.describe('From list_apartments') },
      outputSchema: {
        apartment: z.object({
          id: z.string(),
          name: z.string(),
          address: z.string(),
          isActive: z.boolean(),
        }),
        meters: z.array(meter),
        tariffs: z.array(tariffSummary),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ apartmentId }) => {
      const path = { params: { path: { apartmentId } } };
      const [apartment, meters, tariffs] = await Promise.all([
        callApi(NAME, () => api.GET('/apartments/{id}', { params: { path: { id: apartmentId } } })),
        callApi(NAME, () => api.GET('/apartments/{apartmentId}/meters', path)),
        callApi(NAME, () =>
          api.GET('/apartments/{apartmentId}/tariffs', {
            params: { path: { apartmentId }, query: { scope: 'current' } },
          }),
        ),
      ]);
      if (!apartment.ok) return apartment.result;
      if (!meters.ok) return meters.result;
      if (!tariffs.ok) return tariffs.result;
      const a = apartment.data;
      return toolResult({
        apartment: { id: a.id, name: a.name, address: a.address, isActive: a.isActive },
        meters: meters.data.map((m) => ({
          ...toMeterSummary(m),
          installedAt: m.installedAt,
          lastReading: m.lastReading
            ? {
                period: m.lastReading.period,
                readingDate: m.lastReading.readingDate,
                values: m.lastReading.values.map((v) => ({ zone: v.zone, value: v.value })),
              }
            : null,
        })),
        tariffs: tariffs.data.map(toTariffSummary),
      });
    },
  );
}
