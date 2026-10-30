export interface ImageType {
  mime: string;
  ext: string;
}

export type ImageTypeResult = { ok: true; type: ImageType } | { ok: false; message: string };
