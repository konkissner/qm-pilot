import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Readable } from 'node:stream';
import {
  StorageConfigError,
  StorageDeleteForbiddenError,
  createS3ClientFromEnv,
  putObject,
  getObjectStream,
  deleteObject,
} from './storage';

const mockSend = vi.fn();

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn().mockImplementation(() => ({ send: mockSend })),
  PutObjectCommand: vi.fn().mockImplementation((input) => ({ input })),
  GetObjectCommand: vi.fn().mockImplementation((input) => ({ input })),
}));

describe('storage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.S3_ENDPOINT = 'https://fsn1.example.com';
    process.env.S3_BUCKET = 'test-bucket';
    process.env.S3_ACCESS_KEY_ID = 'key';
    process.env.S3_SECRET_ACCESS_KEY = 'secret';
  });

  it('requires S3 configuration', () => {
    delete process.env.S3_ENDPOINT;
    expect(() => createS3ClientFromEnv()).toThrow(StorageConfigError);
  });

  it('uploads with server-side encryption', async () => {
    mockSend.mockResolvedValue({});
    const client = createS3ClientFromEnv();
    await putObject(client, 'files/doc.pdf', Buffer.from('pdf'), 'application/pdf');
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          ServerSideEncryption: 'AES256',
          Key: 'files/doc.pdf',
        }),
      }),
    );
  });

  it('streams objects for authenticated app endpoints', async () => {
    const body = Readable.from(['chunk']);
    mockSend.mockResolvedValue({
      Body: body,
      ContentType: 'application/pdf',
      ContentLength: 5,
    });
    const client = createS3ClientFromEnv();
    const result = await getObjectStream(client, 'files/doc.pdf');
    expect(result.contentType).toBe('application/pdf');
    expect(result.stream).toBe(body);
  });

  it('forbids physical delete of business data', () => {
    expect(() => deleteObject()).toThrow(StorageDeleteForbiddenError);
  });
});
