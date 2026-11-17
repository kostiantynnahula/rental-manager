import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ApiClient } from '../api/api-client.js';
import { kopiykyToUah } from '../helpers/money.js';
import {
  idSchema,
  statementLine,
  statementWarning,
  toStatementLine,
  toStatementWarning,
} from '../helpers/schemas.js';
import { callApi, toolResult } from '../helpers/tool-result.js';

const NAME = 'get_statement';

export function registerGetStatement(server: McpServer, api: ApiClient): void {
  server.registerTool(
    NAME,
    {
      title: 'Get statement',
      description:
        'One issued statement with its lines (rent, fixed fees, metered utilities with consumption and unit ' +
        'price, manual amounts) and the warnings at issue time. Amounts and prices in UAH. Read-only.',
      inputSchema: { statementId: idSchema.describe('From list_statements') },
      outputSchema: {
        id: z.string(),
        apartmentId: z.string(),
        period: z.string(),
        status: z.enum(['ISSUED', 'CANCELLED']),
        total: z.string().describe('UAH'),
        lines: z.array(statementLine),
        warnings: z.array(statementWarning),
        issuedAt: z.string(),
        cancelledAt: z.string().nullable(),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ statementId }) => {
      const statement = await callApi(NAME, () =>
        api.GET('/statements/{id}', { params: { path: { id: statementId } } }),
      );
      if (!statement.ok) return statement.result;
      const s = statement.data;
      return toolResult({
        id: s.id,
        apartmentId: s.apartmentId,
        period: s.period,
        status: s.status,
        total: kopiykyToUah(s.totalAmount),
        lines: s.lines.map(toStatementLine),
        warnings: s.warnings.map(toStatementWarning),
        issuedAt: s.issuedAt,
        cancelledAt: s.cancelledAt ?? null,
      });
    },
  );
}
