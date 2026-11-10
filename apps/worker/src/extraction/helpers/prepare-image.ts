import sharp from 'sharp';

// Claude scales images down to ~1.15 MP and rejects base64 images over 5 MB, so a longer edge than this only adds
// bytes. The API keeps the original untouched; this copy is only sent to the model.
const MAX_SIDE = 1568;

// EXIF orientation applied (phone photos aren't sideways), fit into MAX_SIDE, re-encoded as JPEG.
// Throws if sharp can't decode the image.
export async function prepareImage(original: Buffer): Promise<{ data: string; mimeType: string }> {
  const buffer = await sharp(original, { failOn: 'error' })
    .autoOrient()
    .resize(MAX_SIDE, MAX_SIDE, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 90 })
    .toBuffer();
  return { data: buffer.toString('base64'), mimeType: 'image/jpeg' };
}
