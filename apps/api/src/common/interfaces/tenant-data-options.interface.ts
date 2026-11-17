// Required by every response mapper that can embed tenant data (name, phone), so no caller forgets it:
// API keys never receive tenant data. Key-readable routes pass `tenantDataOptions(user)`; human-only routes (no
// @Scopes) pass `{ withTenants: true }`.
export interface TenantDataOptions {
  withTenants: boolean;
}
