// Extraction can't run with this config (e.g. no ANTHROPIC_API_KEY): retrying won't help, so a job should fail
// without retries instead of repeating the download.
export class ExtractionNotConfiguredError extends Error {
  override name = 'ExtractionNotConfiguredError';
}
