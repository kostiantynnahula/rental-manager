import type { Api } from 'grammy';
import type { IncomingPhoto } from './incoming-photo.interface.js';

// A photo waiting in the AlbumBuffer: not downloaded yet, only what is needed to fetch it and to answer.
export interface BufferedPhoto {
  // The update's grammY Api (carries the token: never log it).
  api: Api;
  chatId: number;
  // The user's message with the photo; the batch answers the first one.
  messageId: number;
  photo: IncomingPhoto;
}
