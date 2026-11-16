// How a tap ended: the answer to the callback query, and which summary to re-render (null = none).
export interface TapOutcome {
  text: string;
  // A refusal is an alert (stays until dismissed); a success is a short toast.
  alert: boolean;
  batchId: string | null;
}
