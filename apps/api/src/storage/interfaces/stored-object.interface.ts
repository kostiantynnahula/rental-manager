import type { Readable } from 'node:stream';

export interface StoredObject {
  body: Readable;
  contentLength?: number;
}
