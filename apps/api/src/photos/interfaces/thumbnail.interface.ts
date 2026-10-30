export interface Thumbnail {
  buffer: Buffer;
  // Of the original, as displayed (after EXIF orientation).
  width: number;
  height: number;
}
