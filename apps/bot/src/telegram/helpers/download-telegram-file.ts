import type { Api } from 'grammy';

// What the Bot API lets a bot download (getFile); bigger files can only be received, not fetched.
export const TELEGRAM_MAX_DOWNLOAD_BYTES = 20 * 1024 * 1024;

// getFile, then the file itself. The download URL contains the bot token, so a failure is rethrown as our own
// error with no URL and no cause — it ends up in logs.
export async function downloadTelegramFile(
  api: Api,
  token: string,
  fileId: string,
): Promise<Buffer> {
  const file = await api.getFile(fileId);
  if (!file.file_path) throw new Error('Telegram file download failed (no file_path)');
  let response: Response;
  try {
    response = await fetch(`https://api.telegram.org/file/bot${token}/${file.file_path}`);
  } catch {
    throw new Error('Telegram file download failed (network error)');
  }
  if (!response.ok) throw new Error(`Telegram file download failed (HTTP ${response.status})`);
  return Buffer.from(await response.arrayBuffer());
}
