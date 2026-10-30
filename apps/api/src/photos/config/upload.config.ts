import { ConfigService } from '@nestjs/config';
import type { MulterModuleOptions } from '@nestjs/platform-express';
import { Env } from '../../config/env.validation.js';

// No `storage`/`dest` = multer's in-memory storage (file.buffer), up to
// PHOTO_MAX_FILES × PHOTO_MAX_FILE_SIZE_MB per request: we hash and thumbnail before storing.
export function multerOptionsFromConfig(config: ConfigService<Env, true>): MulterModuleOptions {
  return {
    // Browsers send UTF-8 filenames without a charset; busboy's default (latin1) garbles Cyrillic.
    defParamCharset: 'utf8',
    limits: {
      files: config.get('PHOTO_MAX_FILES', { infer: true }),
      fileSize: config.get('PHOTO_MAX_FILE_SIZE_MB', { infer: true }) * 1024 * 1024,
    },
  };
}
