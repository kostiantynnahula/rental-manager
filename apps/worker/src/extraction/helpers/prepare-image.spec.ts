import sharp from 'sharp';
import { prepareImage } from './prepare-image.js';

// Test images are generated here (no fixture files).
function image(width: number, height: number) {
  return sharp({ create: { width, height, channels: 3, background: { r: 200, g: 120, b: 40 } } });
}

async function outputMetadata(original: Buffer) {
  const { data, mimeType } = await prepareImage(original);
  return { mimeType, ...(await sharp(Buffer.from(data, 'base64')).metadata()) };
}

describe('prepareImage', () => {
  it('fits a large landscape photo into 1568 px on the long side', async () => {
    const meta = await outputMetadata(await image(3000, 2000).png().toBuffer());
    expect([meta.width, meta.height]).toEqual([1568, 1045]);
  });

  it('fits a large portrait photo into 1568 px on the long side', async () => {
    const meta = await outputMetadata(await image(2000, 3000).png().toBuffer());
    expect([meta.width, meta.height]).toEqual([1045, 1568]);
  });

  it('does not enlarge a small photo', async () => {
    const meta = await outputMetadata(await image(800, 600).png().toBuffer());
    expect([meta.width, meta.height]).toEqual([800, 600]);
  });

  it('applies the EXIF orientation (6 = rotate 90°)', async () => {
    const sideways = await image(300, 100).jpeg().withMetadata({ orientation: 6 }).toBuffer();
    expect((await sharp(sideways).metadata()).orientation).toBe(6);
    const meta = await outputMetadata(sideways);
    expect([meta.width, meta.height]).toEqual([100, 300]);
    expect(meta.orientation ?? 1).toBe(1);
  });

  it('re-encodes as JPEG', async () => {
    const meta = await outputMetadata(await image(400, 300).png().toBuffer());
    expect(meta.mimeType).toBe('image/jpeg');
    expect(meta.format).toBe('jpeg');
  });

  it('throws on bytes that are not an image', async () => {
    await expect(prepareImage(Buffer.from('not an image'))).rejects.toThrow();
  });
});
