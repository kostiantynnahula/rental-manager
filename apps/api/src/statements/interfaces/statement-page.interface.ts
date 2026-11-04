import type { Statement } from '../../generated/prisma/client.js';

export interface StatementPage {
  items: Statement[];
  total: number;
  page: number;
  pageSize: number;
}
