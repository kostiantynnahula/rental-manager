// `next` comes from the URL, so only accept same-origin paths: "//evil.com" or "/\evil.com"
// would be treated by browsers as another host (open redirect).
export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return '/';
  if (next === '/login' || next.startsWith('/login?')) return '/';
  return next;
}

export function loginUrl(next: string): string {
  return `/login?next=${encodeURIComponent(next)}`;
}
