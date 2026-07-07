import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { authenticator } from 'otplib';
export const DEV_USER_PASSWORD = process.env.DEV_USER_PASSWORD ?? 'DevPassword12!';

function lenaTotpSecret(): string {
  const path = resolve(process.cwd(), 'e2e/.totp-secret');
  if (existsSync(path)) return readFileSync(path, 'utf8').trim();
  return '';
}

export { DEV_USER_PASSWORD, lenaTotpSecret, authenticator };
