import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ApiClient } from '../api/api-client.js';
import { kopiykyToUah } from '../helpers/money.js';
import { collectPages, PAGE_SIZE } from '../helpers/pages.js';
import { idSchema, periodSchema } from '../helpers/schemas.js';
import { callApi, toolResult } from '../helpers/tool-result.js';

const NAME = 'list_statements';

export function registerListStatements(server: McpServer, api: ApiClient): void {
  server.registerTool(
    NAME,
    {
      title: 'List statements',
      description:
        'Issued monthly statements (utility bills) of an apartment, newest first, cancelled included. Totals ' +
        'in UAH. Use get_statement for the lines. For a month without a statement, use preview_statement. ' +
        'truncated = more exist: narrow the range. Read-only.',
      inputSchema: {
        apartmentId: idSchema.describe('From list_apartments'),
        from: periodSchema.optional().describe('First month, YYYY-MM (inclusive)'),
        to: periodSchema.optional().describe('Last month, YYYY-MM (inclusive)'),
      },
      outputSchema: {
        statements: z.array(
          z.object({
            id: z.string(),
            period: z.string(),
            status: z.enum(['ISSUED', 'CANCELLED']),
            total: z.string().describe('UAH'),
            warningsCount: z.number(),
            issuedAt: z.string(),
          }),
        ),
        truncated: z.boolean(),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ apartmentId, from, to }) => {
      // The API filters by one exact month only; a range is filtered here ("YYYY-MM" sorts as text). Statements
      // newer than `to` still count toward the page cap; with one statement a month, the cap is ~40 years.
      const period = from && from === to ? from : undefined;
      const pages = await collectPages(
        (page) =>
          callApi(NAME, () =>
            api.GET('/apartments/{apartmentId}/statements', {
              params: { path: { apartmentId }, query: { period, page, pageSize: PAGE_SIZE } },
            }),
          ),
        // Newest period first: once below `from`, the rest is too.
        from ? (s) => s.period < from : undefined,
      );
      if (!pages.ok) return pages.result;
      return toolResult({
        statements: pages.items
          .filter((s) => !to || s.period <= to)
          .map((s) => ({
            id: s.id,
            period: s.period,
            status: s.status,
            total: kopiykyToUah(s.totalAmount),
            warningsCount: s.warningsCount,
            issuedAt: s.issuedAt,
          })),
        truncated: pages.truncated,
      });
    },
  );
}
