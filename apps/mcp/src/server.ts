import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ApiClient } from './api/api-client.js';
import { logToolCalls } from './helpers/call-log.js';
import { registerGetApartment } from './tools/get-apartment.js';
import { registerGetMonthReadings } from './tools/get-month-readings.js';
import { registerGetReadingHistory } from './tools/get-reading-history.js';
import { registerGetStatement } from './tools/get-statement.js';
import { registerGetTariffs } from './tools/get-tariffs.js';
import { registerListApartments } from './tools/list-apartments.js';
import { registerListStatements } from './tools/list-statements.js';
import { registerPreviewStatement } from './tools/preview-statement.js';

// One file per tool in tools/, each registered here. All are read-only. Every call is logged (`logToolCalls`).
export function createServer(api: ApiClient): McpServer {
  const server = new McpServer({ name: 'rental-manager', version: '0.0.1' });
  logToolCalls(server);
  for (const register of [
    registerListApartments,
    registerGetApartment,
    registerGetMonthReadings,
    registerGetReadingHistory,
    registerGetTariffs,
    registerListStatements,
    registerGetStatement,
    registerPreviewStatement,
  ]) {
    register(server, api);
  }
  return server;
}
