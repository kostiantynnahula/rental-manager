import { Readable } from 'node:stream';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  NoSuchKey,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Injectable, NotFoundException, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Env } from '../config/env.validation.js';
import { s3ClientConfigFromConfig, storageBucketFromConfig } from './config/storage.config.js';
import type { StoredObject } from './interfaces/stored-object.interface.js';

// Thin wrapper over the S3 API (MinIO in dev). Switching to real S3 is a config change only.
@Injectable()
export class StorageService implements OnModuleDestroy {
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(config: ConfigService<Env, true>) {
    this.s3 = new S3Client(s3ClientConfigFromConfig(config));
    this.bucket = storageBucketFromConfig(config);
  }

  async put(key: string, body: Buffer, contentType: string): Promise<void> {
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        ContentLength: body.length,
      }),
    );
  }

  async getStream(key: string): Promise<StoredObject> {
    try {
      const { Body, ContentLength } = await this.s3.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      // In Node the SDK returns an IncomingMessage (a Readable).
      if (!(Body instanceof Readable)) throw new Error(`Unexpected body type for ${key}`);
      return { body: Body, contentLength: ContentLength };
    } catch (e) {
      if (e instanceof NoSuchKey) throw new NotFoundException('File not found in storage');
      throw e;
    }
  }

  // S3 DeleteObject succeeds for a missing key, so this is idempotent.
  async delete(key: string): Promise<void> {
    await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  onModuleDestroy(): void {
    this.s3.destroy();
  }
}
