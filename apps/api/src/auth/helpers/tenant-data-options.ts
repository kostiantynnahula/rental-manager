import type { TenantDataOptions } from '../../common/interfaces/tenant-data-options.interface.js';
import type { AuthUser } from '../interfaces/auth-user.interface.js';

// Tenant data is human-only: a request made with an API key gets responses without it.
export function tenantDataOptions(user: AuthUser): TenantDataOptions {
  return { withTenants: !user.apiKeyId };
}
