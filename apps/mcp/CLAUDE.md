# apps/mcp — MCP server (Claude Desktop)

Plain TypeScript, native ESM (relative imports need `.js`), no Nest. `@modelcontextprotocol/sdk` over stdio: Claude
Desktop (or the MCP Inspector) starts `node apps/mcp/dist/main.js` as a child process. A read-only HTTP client of
the API with its own key (`--service mcp`, read scopes + `statements:preview`, see `.claude/rules/api-auth.md`).

## Commands (from repo root)

- build: `pnpm --filter mcp build` → `dist/` (Claude Desktop runs the build, so rebuild after changes;
  `pnpm --filter mcp dev` = `tsc --watch`). Not part of root `pnpm dev`: the client starts the process.
- test: `pnpm --filter mcp test` · lint: `pnpm --filter mcp lint`
- API types: root `pnpm gen:api` → `src/api/schema.d.ts`: only the operations whose `API key scope` is in the MCP
  key's set (`MCP_SCOPES` in `scripts/gen-api.mjs`, kept in sync with the README's `apikey:create`), so write
  routes of other keys don't type-check. A new tool needing a new scope → API + README + `MCP_SCOPES`.
- format: run Prettier from the repo root (`pnpm format`): only the root `.prettierignore` keeps it off the
  generated `schema.d.ts`.
- debug: `npx @modelcontextprotocol/inspector -e API_BASE_URL=… -e MCP_API_KEY=… node apps/mcp/dist/main.js`

## Rules

- **stdout is the protocol.** Any other byte there breaks it, and Claude Desktop drops the server silently. Log only
  with `log()` (`src/logger.ts`, stderr); `console.log`/`info` are lint errors (`no-console`).
- **Env** (`src/config/env.ts`, zod): `API_BASE_URL` (with `/api`), `MCP_API_KEY` (`rm_…`), passed by the client's
  config (`env`), not the root `.env`. Invalid → names + rules on stderr (never values), exit 1. Never log the key,
  the client options or request headers.
- **Field allowlist.** A tool never passes an API body through: it builds its result field by field
  (`toApartmentSummary`-style). Notes, leases and tenant data never leave the server unless a tool's issue says so
  (API keys get no tenant data anyway).
- **One file per tool** in `src/tools/<tool-name>.ts` exporting `register<Tool>(server, api)`, registered in
  `src/server.ts`. Each tool: `inputSchema` + `outputSchema` (zod), `annotations.readOnlyHint`, result via
  `toolResult()` (`structuredContent` + the same JSON as text); API calls go through `callApi()`, which turns a
  non-2xx or a thrown error into `apiError()` — `src/helpers/tool-result.ts`. A 4xx carries the API's `message`
  (e.g. "Apartment not found", a validation message: the model needs it to fix its call); a 5xx / network error
  only the status. stderr never gets a response body.
- Descriptions say when to use the tool (and which tool gives the ids it needs), the formats (`YYYY-MM` months,
  `YYYY-MM-DD` dates), that it's read-only, and that money is UAH. Inputs are validated by zod (`periodSchema`,
  `idSchema`), so a bad argument never reaches the API.
- **Money**: the API's integer kopiyky → `kopiykyToUah()` (`"15864.00"`); UAH input → `uahToKopiyky()`; prices
  (`"4.3200"`) pass through. Integer math only, never floats, never a recalculation (`src/helpers/money.ts`).
- Shared output shapes + their allowlist mappers (meter, tariff, statement line/warning) live in
  `src/helpers/schemas.ts`. Optional API fields become `null`, so outputs have a fixed shape.
- Paginated lists: `collectPages()` (`src/helpers/pages.ts`), 50 × at most 10 pages, `truncated: true` beyond;
  `stop` ends a sorted walk early (`list_statements` filters a month range the API doesn't have).

## Tests

- `pnpm --filter mcp test` (Vitest, globals). Specs colocated (`foo.ts` → `foo.spec.ts`), excluded from the build.
- A tool is tested through the protocol: `connect(routes)` (`src/test/mcp-client.ts`, excluded from the build) =
  the real `createServer(api)` and an SDK `Client`, linked by `InMemoryTransport.createLinkedPair()`;
  `captureStderr()` mutes and records the log. Shared API fixtures also live in `src/test/`. The API is
  `fakeApi<paths>(routes)` from `@rental/testing` (an unknown route fails the test). Assert `structuredContent`, the text, and the requests sent; give the fake API extra fields
  (notes, lease) and assert they don't come out.
- Every new tool gets such a spec (happy path, an API error) and a row in `src/server.spec.ts` (listed, read-only,
  required inputs).
