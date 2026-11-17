import { z } from 'zod';

// Every env var the MCP server reads. Claude Desktop passes them from `claude_desktop_config.json` (`env`).
// Messages never echo a value: the key is a secret.
const envSchema = z.object({
  // Includes the global prefix, e.g. http://localhost:3001/api (OpenAPI paths have no /api).
  API_BASE_URL: z.string().regex(/^https?:\/\//, 'must be an http(s):// URL'),
  // API key of the MCP service user (`pnpm --filter api apikey:create --service mcp ...`). Never log it.
  MCP_API_KEY: z.string().startsWith('rm_', 'must be an API key (rm_…)'),
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
