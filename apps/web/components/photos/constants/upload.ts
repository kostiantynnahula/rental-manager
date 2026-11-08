// Same as the API (images detected from content: JPEG/PNG/WebP). No `capture`: photos come from the gallery (Viber).
export const PHOTO_ACCEPT = 'image/jpeg,image/png,image/webp';

// For messages only; the API enforces PHOTO_MAX_FILES / PHOTO_MAX_FILE_SIZE_MB (keep in sync with .env).
export const PHOTO_MAX_FILES = 10;
export const PHOTO_MAX_FILE_SIZE_MB = 15;
