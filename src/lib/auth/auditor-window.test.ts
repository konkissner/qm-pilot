import { describe, expect, it } from 'vitest';
import { auditorWindowStatus, isAuditorInviteActive, nextAuditorInviteStatus } from './auditor-window';

describe('auditor invite window', () => {
  const from = new Date('2026-01-01T00:00:00Z');
  const until = new Date('2026-01-31T23:59:59Z');

  it('detects before, active, after', () => {
    expect(auditorWindowStatus(from, until, new Date('2025-12-01'))).toBe('before');
    expect(auditorWindowStatus(from, until, new Date('2026-01-15'))).toBe('active');
    expect(auditorWindowStatus(from, until, new Date('2026-02-01'))).toBe('after');
  });

  it('marks expired after window', () => {
    expect(nextAuditorInviteStatus(from, until, 'active', new Date('2026-02-01'))).toBe('expired');
  });

  it('active only in window with active status', () => {
    expect(isAuditorInviteActive(from, until, 'active', new Date('2026-01-15'))).toBe(true);
    expect(isAuditorInviteActive(from, until, 'pending', new Date('2026-01-15'))).toBe(false);
    expect(isAuditorInviteActive(from, until, 'active', new Date('2026-02-02'))).toBe(false);
  });
});
