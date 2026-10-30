import type { StoredObject } from '../../storage/interfaces/stored-object.interface.js';

export interface PhotoFile extends StoredObject {
  mimeType: string;
}
