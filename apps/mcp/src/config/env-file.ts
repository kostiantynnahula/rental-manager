import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';

// The env files, most specific first: apps/mcp/.env (an override), then the repo-root .env (shared with the other
// apps). Resolved from this file (src/config/ or dist/config/, same depth), never from the cwd: the client
// (Claude Code, Claude Desktop) picks the cwd it spawns us with.
export function defaultEnvFiles(): string[] {
  return [
    fileURLToPath(new URL('../../.env', import.meta.url)),
    fileURLToPath(new URL('../../../../.env', import.meta.url)),
  ];
}

// Loads the first existing file into `env`. Values already set win (the client's `env` block); an empty string
// counts as unset, so a `${VAR}` without the var doesn't shadow the file. Returns the loaded path, or null.
// `util.parseEnv` instead of `process.loadEnvFile()`: the latter never overrides a set key, even ''.
export function loadEnvFile(
  env: Record<string, string | undefined>,
  candidates: string[] = defaultEnvFiles(),
): string | null {
  const path = candidates.find((candidate) => existsSync(candidate));
  if (!path) return null;
  for (const [key, value] of Object.entries(parseEnv(readFileSync(path, 'utf8')))) {
    if (env[key] === undefined || env[key] === '') env[key] = value;
  }
  return path;
}
