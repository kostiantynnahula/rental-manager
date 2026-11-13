import type { ApiClient } from '../../api/api-client.js';
import type { UploadFile } from '../interfaces/upload-file.interface.js';
import type { UploadResponse } from '../interfaces/upload-response.interface.js';
import { badFileIndex } from './bad-file-index.js';

// One POST /photos (inbox, scope photos:upload) with every file + replyTo: the API gives the newly stored ones one
// batchId. Never throws. Never log headers (the key) or bodies (photo bytes).
export async function uploadPhotos(
  api: ApiClient,
  files: readonly UploadFile[],
  replyTo: string,
): Promise<UploadResponse> {
  const form = new FormData();
  for (const f of files) form.append('files', new Blob([f.bytes]), f.filename);
  form.append('replyTo', replyTo);
  let result;
  try {
    result = await api.POST('/photos', {
      // The typed body is a placeholder: the request body is the FormData above.
      body: { files: [] },
      bodySerializer: () => form,
    });
  } catch (error) {
    const name = error instanceof Error ? error.name : 'Error';
    return { kind: 'failed', detail: `network error (${name})` };
  }
  const { data, error, response } = result;
  if (data) return { kind: 'stored', duplicates: data.map((p) => p.duplicate) };
  // The OpenAPI document has no error schema (typed `never`): read the Nest error body as unknown.
  const body: unknown = error;
  const message =
    typeof body === 'object' && body !== null && 'message' in body ? String(body.message) : '';
  const index = response.status === 400 ? badFileIndex(message) : null;
  if (index !== null && index < files.length) return { kind: 'bad-file', index };
  if (response.status === 413) return { kind: 'too-large' };
  if (response.status === 401 || response.status === 403) {
    return { kind: 'unauthorized', status: response.status };
  }
  return { kind: 'failed', detail: `HTTP ${response.status}${message ? ` (${message})` : ''}` };
}
