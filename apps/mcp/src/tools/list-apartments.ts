import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ApiClient } from '../api/api-client.js';
import type { components } from '../api/schema.js';
import { apiError, toolResult } from '../helpers/tool-result.js';

const NAME = 'list_apartments';

const apartmentSummary = z.object({
  id: z.string(),
  name: z.string(),
  address: z.string(),
  isActive: z.boolean().describe('false = archived'),
});

type ApartmentSummary = z.infer<typeof apartmentSummary>;

// Field allowlist: only these leave the server (no notes, no lease or tenant data).
function toApartmentSummary(
  a: components['schemas']['ApartmentDetailResponseDto'],
): ApartmentSummary {
  return { id: a.id, name: a.name, address: a.address, isActive: a.isActive };
}

export function registerListApartments(server: McpServer, api: ApiClient): void {
  server.registerTool(
    NAME,
    {
      title: 'List apartments',
      description:
        'The rental apartments: id, name, address and whether it is active. Archived ones only on request.',
      inputSchema: {
        includeArchived: z
          .boolean()
          .optional()
          .describe('Also list archived apartments (default: active only)'),
      },
      outputSchema: { apartments: z.array(apartmentSummary) },
      annotations: { readOnlyHint: true },
    },
    async ({ includeArchived }) => {
      try {
        const { data, response } = await api.GET('/apartments', {
          params: { query: { active: includeArchived ? 'all' : 'true' } },
        });
        if (!data) return apiError(NAME, response);
        return toolResult({ apartments: data.map(toApartmentSummary) });
      } catch (error) {
        return apiError(NAME, undefined, error);
      }
    },
  );
}
