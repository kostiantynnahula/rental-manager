import { DEFAULT_TOOL_LABEL, TOOL_LABELS } from '../constants/tool-labels';

// "Шукаю фото: холодильник…" — the search query is shown once the model has streamed it.
export function toolStatusLabel(toolName: string, input: unknown): string {
  const label = TOOL_LABELS[toolName] ?? DEFAULT_TOOL_LABEL;
  const query =
    toolName === 'search_photos' && typeof input === 'object' && input !== null && 'query' in input
      ? input.query
      : undefined;
  return typeof query === 'string' && query.trim() ? `${label}: ${query.trim()}…` : `${label}…`;
}
