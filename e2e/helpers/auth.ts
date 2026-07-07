import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { authenticator } from 'otplib';
import { DEV_USER_PASSWORD } from '../scripts/seed';

function lenaTotpSecret(): string {
  const path = resolve(process.cwd(), 'e2e/.totp-secret');
  if (existsSync(path)) return readFileSync(path, 'utf8').trim();
  return '';
}

export { DEV_USER_PASSWORD, lenaTotpSecret, authenticator };
