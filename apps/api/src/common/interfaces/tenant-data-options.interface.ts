// Response mappers that can embed tenant data (name, phone). API keys never receive it: tenants are human-only.
export interface TenantDataOptions {
  withTenants?: boolean;
}
