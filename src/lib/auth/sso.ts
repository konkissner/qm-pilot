import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

const ALGO = 'aes-256-gcm';

function deriveKey(secret: string): Buffer {
  return createHash('sha256').update(`qm-pilot-sso:${secret}`).digest();
}

export function encryptSecret(plaintext: string, encryptionKey: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, deriveKey(encryptionKey), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

export function decryptSecret(payload: string, encryptionKey: string): string {
  const buf = Buffer.from(payload, 'base64');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const decipher = createDecipheriv(ALGO, deriveKey(encryptionKey), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}

export interface TenantSsoConfig {
  issuer: string;
  tenantId: string;
  clientId: string;
  clientSecret: string;
  enabled: boolean;
}

export function parseSsoConfig(raw: unknown): TenantSsoConfig | null {
  if (!raw || typeof raw !== 'object') return null;
  const cfg = raw as Record<string, unknown>;
  if (!cfg.enabled) return null;
  if (typeof cfg.issuer !== 'string' || typeof cfg.clientId !== 'string' || typeof cfg.clientSecret !== 'string') {
    return null;
  }
  return {
    issuer: cfg.issuer,
    tenantId: typeof cfg.tenantId === 'string' ? cfg.tenantId : '',
    clientId: cfg.clientId,
    clientSecret: cfg.clientSecret,
    enabled: true,
  };
}
