import { SEARCH_QUERY_MAX_LENGTH } from '../constants/search';

// ?q= trimmed and capped like the input ('' when missing): a hand-edited or shared link can't send what the API
// would refuse (blank → 400, longer than its limit → 400).
export function parseQuery(value: string | null): string {
  return (value ?? '').trim().slice(0, SEARCH_QUERY_MAX_LENGTH);
}
