// What JwtAuthGuard puts on req.user: only the id from the token, no DB lookup.
export interface AuthUser {
  id: string;
}
