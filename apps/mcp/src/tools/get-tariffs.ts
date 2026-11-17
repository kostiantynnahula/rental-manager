import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ApiClient } from '../api/api-client.js';
import { idSchema, tariffSummary, toTariffSummary } from '../helpers/schemas.js';
import { callApi, toolResult } from '../helpers/tool-result.js';

const NAME = 'get_tariffs';

export function registerGetTariffs(server: McpServer, api: ApiClient): void {
  server.registerTool(
    NAME,
    {
      title: 'Apartment tariffs',
      description:
        "The apartment's tariffs with the prices in effect this month (UAH per unit; FIXED = a monthly fee). " +
        'For the prices used in a past month, see get_statement or preview_statement. Read-only.',
      inputSchema: {
        apartmentId: idSchema.describe('From list_apartments'),
        includeEnded: z
          .boolean()
          .optional()
          .describe('Also tariffs no longer attached (default: current)'),
      },
      outputSchema: { tariffs: z.array(tariffSummary) },
      annotations: { readOnlyHint: true },
    },
    async ({ apartmentId, includeEnded }) => {
      const tariffs = await callApi(NAME, () =>
        api.GET('/apartments/{apartmentId}/tariffs', {
          params: { path: { apartmentId }, query: { scope: includeEnded ? 'all' : 'current' } },
        }),
      );
      if (!tariffs.ok) return tariffs.result;
      return toolResult({ tariffs: tariffs.data.map(toTariffSummary) });
    },
  );
}
