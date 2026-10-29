// Emails are stored lowercase + trimmed (the DB enforces it with a CHECK constraint).
// Run every incoming email through this before querying or writing.
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
