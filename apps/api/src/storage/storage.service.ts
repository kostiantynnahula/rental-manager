import { Readable } from 'node:stream';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  NoSuchKey,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Injectable, Logger, NotFoundException, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Env } from '../config/env.validation.js';
import { s3ClientConfigFromConfig, storageBucketFromConfig } from './config/storage.config.js';
import type { NewObject } from './interfaces/new-object.interface.js';
import type { StoredObject } from './interfaces/stored-object.interface.js';

// Thin wrapper over the S3 API (MinIO in dev). Switching to real S3 is a config change only.
@Injectable()
export class StorageService implements OnModuleDestroy {
  private readonly logger = new Logger(StorageService.name);
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

  // All or nothing: if one put fails, the objects already put are deleted, then the error is rethrown.
  async putAll(objects: NewObject[]): Promise<void> {
    const putKeys: string[] = [];
    try {
      for (const { key, body, contentType } of objects) {
        await this.put(key, body, contentType);
        putKeys.push(key);
      }
    } catch (e) {
      await this.deleteAll(...putKeys);
      throw e;
    }
  }

  // Best effort, never throws: a failed delete only leaves a logged orphan object (callers delete the row first).
  async deleteAll(...keys: string[]): Promise<void> {
    const results = await Promise.allSettled(keys.map((key) => this.delete(key)));
    results.forEach((r, i) => {
      if (r.status === 'rejected') this.logger.error(`Orphaned storage object: ${keys[i]}`);
    });
  }

  onModuleDestroy(): void {
    this.s3.destroy();
  }
}
