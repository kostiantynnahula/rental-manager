import { z } from 'zod';

// Every env var the MCP server reads: the client's `env` block (Claude Desktop's config) wins, then
// apps/mcp/.env, else the repo-root .env (`loadEnvFile`, before this runs). Messages never echo a value: the key
// is a secret.
const envSchema = z.object({
  // Includes the global prefix, e.g. http://localhost:3001/api (OpenAPI paths have no /api).
  API_BASE_URL: z.string().regex(/^https?:\/\//, 'must be an http(s):// URL'),
  // API key of the MCP service user (`pnpm --filter api apikey:create --service mcp ...`). Never log it.
  MCP_API_KEY: z.string().startsWith('rm_', 'must be an API key (rm_…)'),
  // Optional: log lines are also appended here (for `tail -f`); stderr always. '' = unset.
  MCP_LOG_FILE: z
    .string()
    .optional()
    .transform((value) => value || undefined),
});

export type Env = z.infer<typeof envSchema>;

// Fails fast at startup with all invalid vars listed (names and rules, never values).
export function loadEnv(raw: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(raw);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment variables:\n${details}`);
  }
  return result.data;
}
