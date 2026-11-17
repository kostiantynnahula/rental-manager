import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ApiClient } from '../api/api-client.js';
import { kopiykyToUah, UAH_AMOUNT, uahToKopiyky } from '../helpers/money.js';
import {
  idSchema,
  periodSchema,
  statementLine,
  statementWarning,
  toStatementLine,
  toStatementWarning,
} from '../helpers/schemas.js';
import { callApi, toolResult } from '../helpers/tool-result.js';

const NAME = 'preview_statement';

export function registerPreviewStatement(server: McpServer, api: ApiClient): void {
  server.registerTool(
    NAME,
    {
      title: 'Preview statement',
      description:
        'How much to charge for a month ("скільки нарахувати"): the statement calculated now from confirmed ' +
        'readings, current tariffs and rent. Nothing is saved or issued. Warnings explain what is missing ' +
        '(e.g. MISSING_READING, MISSING_MANUAL_AMOUNT). Amounts in UAH.',
      inputSchema: {
        apartmentId: idSchema.describe('From list_apartments'),
        period: periodSchema,
        manualAmounts: z
          .record(idSchema, z.string().regex(UAH_AMOUNT, 'must be UAH, e.g. "123.45"'))
          .optional()
          .describe('UAH per MANUAL tariff id (from get_tariffs), as on the bill'),
      },
      outputSchema: {
        period: z.string(),
        total: z.string().describe('UAH'),
        lines: z.array(statementLine),
        warnings: z.array(statementWarning),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ apartmentId, period, manualAmounts }) => {
      const preview = await callApi(NAME, () =>
        api.POST('/apartments/{apartmentId}/statements/preview', {
          params: { path: { apartmentId } },
          body: {
            period,
            manualAmounts: manualAmounts
              ? Object.fromEntries(
                  Object.entries(manualAmounts).map(([id, uah]) => [id, uahToKopiyky(uah)]),
                )
              : undefined,
          },
        }),
      );
      if (!preview.ok) return preview.result;
      const p = preview.data;
      return toolResult({
        period: p.period,
        total: kopiykyToUah(p.total),
        lines: p.lines.map(toStatementLine),
        warnings: p.warnings.map(toStatementWarning),
      });
    },
  );
}
