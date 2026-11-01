import createClient from 'openapi-fetch';
import { authMiddleware } from './auth-middleware';
import type { paths } from './schema';

// Paths are typed from the generated schema (`pnpm gen:api`); requests go to the same-origin /api proxy
// (next.config.ts rewrites), so the httpOnly auth cookies are sent automatically.
export const api = createClient<paths>({ baseUrl: '/api', credentials: 'same-origin' });
api.use(authMiddleware);
