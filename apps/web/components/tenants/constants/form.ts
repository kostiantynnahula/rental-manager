// Same limits as CreateTenantDto.
export const TENANT_NAME_MAX = 200;

export const PHONE_HINT = 'Український номер, напр. 067 123 45 67';

// monthlyRent is a Postgres integer (kopiyky), same bound as PG_INT_MAX in the API.
export const MAX_RENT_KOPIYKY = 2_147_483_647;
