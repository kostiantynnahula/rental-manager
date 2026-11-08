// What JwtAuthGuard puts on req.user: only the id (from the JWT or the API key), no extra lookup.
export interface AuthUser {
  id: string;
  // Set only when the request was authenticated with an API key (service user).
  apiKeyId?: string;
}
