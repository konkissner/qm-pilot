import type { AuditorInviteStatus } from '@prisma/client';

export type AuditorWindowStatus = 'before' | 'active' | 'after';

export function auditorWindowStatus(
  validFrom: Date,
  validUntil: Date,
  now = new Date(),
): AuditorWindowStatus {
  if (now < validFrom) return 'before';
  if (now > validUntil) return 'after';
  return 'active';
}

export function isAuditorInviteActive(
  validFrom: Date,
  validUntil: Date,
  status: AuditorInviteStatus,
  now = new Date(),
): boolean {
  if (status === 'expired') return false;
  return auditorWindowStatus(validFrom, validUntil, now) === 'active' && status === 'active';
}

export function nextAuditorInviteStatus(
  validFrom: Date,
  validUntil: Date,
  current: AuditorInviteStatus,
  now = new Date(),
): AuditorInviteStatus {
  if (current === 'expired') return 'expired';
  const window = auditorWindowStatus(validFrom, validUntil, now);
  if (window === 'after') return 'expired';
  if (window === 'active' && current === 'pending') return 'active';
  return current;
}
