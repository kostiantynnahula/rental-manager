import type { Message } from 'grammy/types';
import { incomingPhoto } from './incoming-photo.js';

const message = (fields: Partial<Message>) => ({ message_id: 1, ...fields }) as Message;

describe('incomingPhoto', () => {
  it('takes the largest size of a compressed photo (Telegram lists it last)', () => {
    const photo = [
      { file_id: 'small', file_unique_id: 's', width: 90, height: 90, file_size: 1_000 },
      { file_id: 'large', file_unique_id: 'L', width: 1280, height: 1280, file_size: 200_000 },
    ];
    expect(incomingPhoto(message({ photo }))).toEqual({
      fileId: 'large',
      fileSize: 200_000,
      filename: 'photo-L.jpg',
      displayName: null,
    });
  });

  it('takes an image sent as a file, with its name', () => {
    const document = {
      file_id: 'doc',
      file_unique_id: 'D',
      file_name: 'meter.png',
      mime_type: 'image/png',
      file_size: 5_000,
    };
    expect(incomingPhoto(message({ document }))).toEqual({
      fileId: 'doc',
      fileSize: 5_000,
      filename: 'meter.png',
      displayName: 'meter.png',
    });
  });

  it('names an image file without a name by its unique id', () => {
    const document = { file_id: 'doc', file_unique_id: 'D', mime_type: 'image/jpeg' };
    expect(incomingPhoto(message({ document }))).toEqual({
      fileId: 'doc',
      fileSize: undefined,
      filename: 'file-D',
      displayName: null,
    });
  });

  it('returns null for a non-image file (a PDF)', () => {
    const document = {
      file_id: 'doc',
      file_unique_id: 'D',
      file_name: 'bill.pdf',
      mime_type: 'application/pdf',
    };
    expect(incomingPhoto(message({ document }))).toBeNull();
  });

  it('returns null for a file without a mime type, and for a text message', () => {
    expect(
      incomingPhoto(message({ document: { file_id: 'doc', file_unique_id: 'D' } })),
    ).toBeNull();
    expect(incomingPhoto(message({ text: 'hi' }))).toBeNull();
  });
});
