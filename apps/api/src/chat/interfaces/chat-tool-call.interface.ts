// One tool call of a run, for the run log (never its input or output text).
export interface ChatToolCall {
  name: string;
  // Rows returned (photos, leases); null = failed.
  count: number | null;
  ms: number;
}
