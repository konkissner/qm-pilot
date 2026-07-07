import type { RoleKey } from '../permissions';

export const ABSOLUTE_SESSION_MAX_MS = 12 * 60 * 60 * 1000;
export const PIN_LENGTH = 4;
export const LOCKOUT_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MS = 15 * 60 * 1000;
export const KIOSK_DEVICE_COOKIE = 'qm_kiosk_device';
export const KIOSK_SESSION_COOKIE = 'qm_kiosk_session';

export const TOTP_REQUIRED_ROLES: RoleKey[] = ['gl', 'rp', 'qmb', 'deputyRp', 'deputyQmb', 'admin'];

export const TRIVIAL_PINS = new Set([
  '0000',
  '1111',
  '2222',
  '3333',
  '4444',
  '5555',
  '6666',
  '7777',
  '8888',
  '9999',
  '1234',
  '4321',
  '0123',
  '1212',
]);

export function throttleDelayMs(attemptNumber: number): number {
  if (attemptNumber === 3) return 5_000;
  if (attemptNumber === 4) return 15_000;
  return 0;
}

export function requiresTotp(roleKeys: RoleKey[]): boolean {
  return roleKeys.some((role) => TOTP_REQUIRED_ROLES.includes(role));
}

export function displayName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim();
}
