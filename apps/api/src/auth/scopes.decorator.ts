import { SetMetadata } from '@nestjs/common';
import type { ApiKeyScope } from '../api-keys/constants/api-key-scopes.js';

export const SCOPES_KEY = 'scopes';

// Opens a route (or a whole controller; the method wins) to API keys holding ALL listed scopes.
// Without @Scopes a route is closed to keys (deny by default). Human (cookie) requests ignore it.
export const Scopes = (...scopes: ApiKeyScope[]) => SetMetadata(SCOPES_KEY, scopes);
