// Ukrainian phones. The rule itself lives in @rental/shared so the API applies exactly the same one.
import { normalizeUaPhone } from '@rental/shared';

export { normalizeUaPhone };

// "+380671234567" (or any accepted input) → "+380 67 123 45 67"; unrecognized input is returned unchanged.
export function formatPhone(phone: string): string {
  const normalized = normalizeUaPhone(phone);
  if (!normalized) return phone;
  const d = normalized.slice(4); // 9 digits after +380
  return `+380 ${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5, 7)} ${d.slice(7)}`;
}

// Opens a Viber chat; the number must be URL-encoded ("+" → %2B).
export function viberHref(phone: string): string {
  return `viber://chat?number=${encodeURIComponent(normalizeUaPhone(phone) ?? phone)}`;
}
