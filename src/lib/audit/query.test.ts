import { describe, expect, it } from 'vitest';
import { AUDIT_CSV_HEADER, formatAuditCsvRow, formatBerlinTimestamp } from './query';

describe('audit query formatting', () => {
  it('formats timestamps in Europe/Berlin', () => {
    const formatted = formatBerlinTimestamp(new Date('2026-01-15T12:00:00.000Z'));
    expect(formatted).toMatch(/15\.01\.2026/);
    expect(formatted).toMatch(/13:00:00/);
  });

  it('builds CSV rows with escaped values', () => {
    const row = formatAuditCsvRow({
      id: '1',
      occurredAt: new Date('2026-01-15T12:00:00.000Z'),
      userId: 'u1',
      userNameSnapshot: 'Max Mustermann',
      action: 'user.created',
      actionLabel: 'Benutzer angelegt',
      objectType: 'User',
      objectId: 'u2',
      objectLabel: 'Neu, User',
      diff: { firstName: { old: null, new: 'Neu' } },
      context: { ip: '127.0.0.1', userAgent: 'vitest' },
      severity: 'info',
    });
    expect(row).toContain('Max Mustermann');
    expect(row).toContain('User: Neu, User');
    expect(AUDIT_CSV_HEADER.split(',')).toHaveLength(6);
  });
});
