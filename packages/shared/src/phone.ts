// Ukrainian phone numbers only (for now). Stored and sent to the API as E.164: "+380671234567".

const SEPARATORS = /[\s\-().]/g;
const UA_PHONE = /^(?:\+380|380|0)(\d{9})$/;

// "0671234567", "067 123 45 67", "+380 67 123-45-67", "380671234567" → "+380671234567"; anything else → null.
export function normalizeUaPhone(input: string): string | null {
  const match = UA_PHONE.exec(input.replace(SEPARATORS, ''));
  return match ? `+380${match[1]}` : null;
}

// Digits to look for inside stored phones: "067123" → "38067123" (matches "+380671234567").
// null when the term isn't phone-like (letters, or fewer than 3 digits) — then it's a name search only.
export function phoneSearchDigits(term: string): string | null {
  const compact = term.replace(SEPARATORS, '');
  if (!/^\+?\d{3,}$/.test(compact)) return null;
  const digits = compact.replace('+', '');
  return digits.startsWith('0') ? `38${digits}` : digits;
}
