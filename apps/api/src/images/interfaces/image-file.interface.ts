import type { StoredObject } from '../../storage/interfaces/stored-object.interface.js';

export interface ImageFile extends StoredObject {
  mimeType: string;
}
