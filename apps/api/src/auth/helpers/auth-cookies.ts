import { CookieOptions, Request, Response } from 'express';
import type { AuthCookieOptions } from '../interfaces/auth-cookie-options.interface.js';

export const ACCESS_COOKIE = 'access_token';
export const REFRESH_COOKIE = 'refresh_token';

// Paths are what the browser sees; the global /api prefix makes them identical behind the web proxy.
// The refresh cookie is only sent to /api/auth/* (refresh + logout), never to the rest of the API.
const ACCESS_PATH = '/api';
const REFRESH_PATH = '/api/auth';

function base(secure: boolean, path: string): CookieOptions {
  return { httpOnly: true, sameSite: 'strict', secure, path };
}

export function setAuthCookies(
  res: Response,
  tokens: { accessToken: string; refreshToken: string },
  opts: AuthCookieOptions,
): void {
  res.cookie(ACCESS_COOKIE, tokens.accessToken, {
    ...base(opts.secure, ACCESS_PATH),
    maxAge: opts.accessTtlSeconds * 1000,
  });
  res.cookie(REFRESH_COOKIE, tokens.refreshToken, {
    ...base(opts.secure, REFRESH_PATH),
    maxAge: opts.refreshTtlDays * 24 * 60 * 60 * 1000,
  });
}

export function clearAuthCookies(res: Response, secure: boolean): void {
  res.clearCookie(ACCESS_COOKIE, base(secure, ACCESS_PATH));
  res.clearCookie(REFRESH_COOKIE, base(secure, REFRESH_PATH));
}

export function getAccessToken(req: Request): string | undefined {
  return readCookie(req, ACCESS_COOKIE);
}

export function getRefreshToken(req: Request): string | undefined {
  return readCookie(req, REFRESH_COOKIE);
}

// req.cookies is filled by cookie-parser (main.ts) and typed as any.
function readCookie(req: Request, name: string): string | undefined {
  return (req.cookies as Record<string, string | undefined>)[name];
}
