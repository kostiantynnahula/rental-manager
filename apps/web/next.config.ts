import { resolve } from 'node:path';
import type { NextConfig } from 'next';

// The monorepo keeps one .env at the root. Next only reads apps/web/.env*, so load the root file too.
// Node's loadEnvFile never overrides variables that are already set (shell or apps/web/.env* win).
try {
  process.loadEnvFile(resolve(process.cwd(), '../../.env'));
} catch {
  // No root .env (e.g. CI or Docker): rely on the real environment.
}

function apiInternalUrl(): string {
  const raw = process.env.API_INTERNAL_URL;
  if (!raw)
    throw new Error('API_INTERNAL_URL is not set (see .env.example), e.g. http://localhost:3001');
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`API_INTERNAL_URL is not a valid URL: "${raw}"`);
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`API_INTERNAL_URL must be http(s): "${raw}"`);
  }
  // Origin only: the /api prefix is part of the rewrite below.
  return url.origin;
}

const API_ORIGIN = apiInternalUrl();

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Same-origin proxy to the API. Keep the /api prefix on both sides: the auth cookies are scoped to
  // Path=/api (access) and Path=/api/auth (refresh), so the browser only sends them to these URLs.
  // Rewrites are resolved at build time, so API_INTERNAL_URL is needed for `next build` too.
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${API_ORIGIN}/api/:path*` }];
  },
};

export default nextConfig;
