const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ?chat= → a chat id, or '' (the list). Not a uuid → the list, instead of a request the API would answer with 400.
export function parseChatId(raw: string | null): string {
  return raw && UUID.test(raw) ? raw : '';
}
