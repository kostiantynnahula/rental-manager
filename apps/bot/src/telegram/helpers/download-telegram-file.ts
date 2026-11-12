import type { Api } from 'grammy';

// What the Bot API lets a bot download (getFile); bigger files can only be received, not fetched.
export const TELEGRAM_MAX_DOWNLOAD_BYTES = 20 * 1024 * 1024;

// getFile, then the file itself, from the same server and environment the grammY client is configured with
// (`apiRoot`, `environment`), so the token stays with the Api object. The download URL contains the token, so a
// failure is rethrown as our own error with no URL and no cause — it ends up in logs.
export async function downloadTelegramFile(
  api: Api,
  fileId: string,
): Promise<Uint8Array<ArrayBuffer>> {
  const file = await api.getFile(fileId);
  if (!file.file_path) throw new Error('Telegram file download failed (no file_path)');
  const root = (api.options?.apiRoot ?? 'https://api.telegram.org').replace(/\/$/, '');
  const env = api.options?.environment === 'test' ? '/test' : '';
  let response: Response;
  try {
    response = await fetch(`${root}/file/bot${api.token}${env}/${file.file_path}`);
  } catch {
    throw new Error('Telegram file download failed (network error)');
  }
  if (!response.ok) throw new Error(`Telegram file download failed (HTTP ${response.status})`);
  // A view of the downloaded buffer, no copy.
  return new Uint8Array(await response.arrayBuffer());
}
