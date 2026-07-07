import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  type S3ClientConfig,
} from '@aws-sdk/client-s3';
import { Readable } from 'node:stream';

export class StorageConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StorageConfigError';
  }
}

export class StorageNotFoundError extends Error {
  constructor(key: string) {
    super(`Object not found: ${key}`);
    this.name = 'StorageNotFoundError';
  }
}

/** Fachdaten must never be physically deleted — use status fields instead. */
export class StorageDeleteForbiddenError extends Error {
  constructor() {
    super('Physical delete of business data is forbidden');
    this.name = 'StorageDeleteForbiddenError';
  }
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new StorageConfigError(`Missing required env: ${name}`);
  }
  return value;
}

export function createS3ClientFromEnv(): S3Client {
  const endpoint = requireEnv('S3_ENDPOINT');
  const region = process.env.S3_REGION ?? 'eu-central';
  const accessKeyId = requireEnv('S3_ACCESS_KEY_ID');
  const secretAccessKey = requireEnv('S3_SECRET_ACCESS_KEY');

  const config: S3ClientConfig = {
    endpoint,
    region,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== 'false',
  };

  return new S3Client(config);
}

export function getBucketName(): string {
  return requireEnv('S3_BUCKET');
}

export async function putObject(
  client: S3Client,
  key: string,
  body: Buffer | Uint8Array | Readable,
  contentType: string,
): Promise<void> {
  const bucket = getBucketName();
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      ServerSideEncryption: 'AES256',
    }),
  );
}

export async function getObjectStream(
  client: S3Client,
  key: string,
): Promise<{ stream: Readable; contentType?: string; contentLength?: number }> {
  const bucket = getBucketName();
  const response = await client.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
  );

  if (!response.Body) {
    throw new StorageNotFoundError(key);
  }

  return {
    stream: response.Body as Readable,
    contentType: response.ContentType,
    contentLength: response.ContentLength,
  };
}

/** Intentionally not implemented for business data — URS / 00_PLAN §12.4 */
export function deleteObject(): never {
  throw new StorageDeleteForbiddenError();
}
