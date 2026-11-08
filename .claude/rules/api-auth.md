---
paths:
  - 'apps/api/src/auth/**'
  - 'apps/web/lib/api/auth-*'
---

# Authentication (API)

## Auth (`src/auth/`)

- Global `/api` prefix so API paths equal what the browser sees through the web app's `/api/*` proxy (same origin); cookie paths depend on it.
- **Access token**: JWT (`@nestjs/jwt`, no Passport), payload `{ sub: userId }`, TTL `JWT_ACCESS_TTL_SECONDS` (900). Cookie `access_token`, `Path=/api`.
- **Refresh token**: opaque random 32 bytes, TTL `REFRESH_TOKEN_TTL_DAYS` (30, sliding). Cookie `refresh_token`, `Path=/api/auth`.
  Stored only as SHA-256 in `Session` (fast hash is fine for a random token; it's the unique lookup key).
- Cookies: `httpOnly`, `SameSite=Strict`, `Secure` in production. Helpers in `helpers/auth-cookies.ts`.
- Rotation on every `POST /auth/refresh` (atomic: old row gets `revokedAt` + `replacedById`). Presenting a revoked token = reuse → **all** sessions of that user are revoked. Two tabs refreshing at once trigger this too (accepted for a single user).
- `JwtAuthGuard` is global (`APP_GUARD`) and stateless (no DB hit): every route needs a valid access token unless marked `@Public()`. Use `@CurrentUser()` → `{ id }`; load the user if you need more. Deactivation takes effect within one access TTL.
- Endpoints: `POST /auth/login` (public), `POST /auth/refresh` (public), `POST /auth/logout` (public, revokes the session from the refresh cookie, always clears cookies), `GET /auth/me`.
- Login: email normalized; unknown email, SERVICE user (no password), wrong password and inactive user all → `401 Invalid email or password` (a dummy argon2 verify keeps timing equal). Service users authenticate only with API keys (`ApiKey`, see `apps/api/CLAUDE.md`).
- Rate limit: `ThrottlerGuard` on `AuthController` only — login 5/min, refresh 30/min per IP (`trust proxy` = loopback, so the proxy's `X-Forwarded-For` counts).
- Secrets/TTLs come from `ConfigService` (`JWT_ACCESS_SECRET` ≥ 32 chars, required). Never log tokens.
- Config → options mapping lives in `src/auth/config/` as pure `*OptionsFromConfig(config: ConfigService<Env, true>)` functions (`jwt.config.ts`, `cookie.config.ts`). Follow this pattern in other features (`src/<feature>/config/`).
- Swagger: cookie auth is declared; log in via "Try it out" on `/api/auth/login` and the browser sends the cookie for later calls.
- e2e tests importing `AppModule` get the guard too — test-only controllers need `@Public()`.
- API keys for service users: `src/api-keys/` (see `apps/api/CLAUDE.md`). The guard will authenticate `Bearer rm_…` tokens via `ApiKeysService.verify`; never log the `Authorization` header or a key, only its prefix.
