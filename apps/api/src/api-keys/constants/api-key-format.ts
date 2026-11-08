// Every key starts with this, so the auth guard can tell a key from a JWT without a DB lookup.
export const API_KEY_PREFIX = 'rm_';

// Service users get emails on the reserved `.invalid` TLD, so they can never collide with a real address.
export const SERVICE_EMAIL_DOMAIN = 'service.invalid';
