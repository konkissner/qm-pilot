import { describe, expect, it, vi, beforeEach } from 'vitest';
import { recordBackupRun, checkBackupFreshness, sendBackupAlarm } from './backup-monitor';

const mockRecord = vi.fn();
const mockGetLatest = vi.fn();
const mockSendMail = vi.fn();

vi.mock('./scheduler-run', () => ({
  recordSchedulerRun: (...args: unknown[]) => mockRecord(...args),
  getLatestSchedulerRun: (...args: unknown[]) => mockGetLatest(...args),
}));

vi.mock('nodemailer', () => ({
  default: {
    createTransport: () => ({ sendMail: mockSendMail }),
  },
}));

describe('backup-monitor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.SMTP_HOST;
    mockRecord.mockResolvedValue('run_1');
    mockSendMail.mockResolvedValue({});
  });

  it('records failed backup and logs alarm without SMTP', async () => {
    const logSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await recordBackupRun({ success: false, durationMs: 100, error: 'disk full' });
    expect(mockRecord).toHaveBeenCalledWith(
      'backupFull',
      'failed',
      expect.objectContaining({ error: 'disk full' }),
    );
    expect(logSpy).toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it('sends email alarm when SMTP is configured', async () => {
    process.env.SMTP_HOST = 'smtp.example.de';
    process.env.SMTP_USER = 'user';
    process.env.SMTP_PASS = 'pass';
    process.env.SMTP_FROM = 'from@example.de';
    process.env.ADMIN_ALERT_EMAIL = 'admin@example.de';

    const channel = await sendBackupAlarm('Test', 'Body');
    expect(channel).toBe('email');
    expect(mockSendMail).toHaveBeenCalled();
  });

  it('detects overdue backup and records failed backupCheck', async () => {
    const stale = new Date(Date.now() - 27 * 60 * 60 * 1000);
    mockGetLatest.mockResolvedValue({ startedAt: stale });

    const result = await checkBackupFreshness();
    expect(result.overdue).toBe(true);
    expect(mockRecord).toHaveBeenCalledWith(
      'backupCheck',
      'failed',
      expect.objectContaining({ reason: 'backup_overdue' }),
    );
  });

  it('records ok backupCheck when backup is fresh', async () => {
    mockGetLatest.mockResolvedValue({ startedAt: new Date() });
    const result = await checkBackupFreshness();
    expect(result.overdue).toBe(false);
    expect(mockRecord).toHaveBeenCalledWith('backupCheck', 'ok', expect.any(Object));
  });
});
