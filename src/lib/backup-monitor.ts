import nodemailer from 'nodemailer';
import { recordSchedulerRun, getLatestSchedulerRun } from './scheduler-run';
import { isBackupOverdue, BACKUP_MAX_AGE_MS } from './health';

export interface BackupRunResult {
  success: boolean;
  durationMs: number;
  sizeBytes?: number;
  error?: string;
}

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
  adminTo: string;
}

function getSmtpConfig(): SmtpConfig | null {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM;
  const adminTo = process.env.ADMIN_ALERT_EMAIL;

  if (!host || !user || !pass || !from || !adminTo) {
    return null;
  }

  return {
    host,
    port: Number(process.env.SMTP_PORT ?? '587'),
    secure: process.env.SMTP_SECURE === 'true',
    user,
    pass,
    from,
    adminTo,
  };
}

export async function sendBackupAlarm(subject: string, body: string): Promise<'email' | 'log'> {
  const smtp = getSmtpConfig();
  if (!smtp) {
    console.error(`[backup-alarm] SMTP not configured — ${subject}: ${body}`);
    return 'log';
  }

  const transport = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: { user: smtp.user, pass: smtp.pass },
  });

  await transport.sendMail({
    from: smtp.from,
    to: smtp.adminTo,
    subject: `[QM-Pilot] ${subject}`,
    text: body,
  });

  return 'email';
}

export async function recordBackupRun(result: BackupRunResult): Promise<void> {
  const status = result.success ? 'ok' : 'failed';
  await recordSchedulerRun('backupFull', status, {
    durationMs: result.durationMs,
    sizeBytes: result.sizeBytes,
    error: result.error,
  });

  if (!result.success) {
    await sendBackupAlarm(
      'Backup failed',
      `Full backup failed after ${result.durationMs}ms: ${result.error ?? 'unknown error'}`,
    );
  }
}

export async function checkBackupFreshness(now = new Date()): Promise<{
  overdue: boolean;
  lastBackupAt: Date | null;
  ageMs: number | null;
  alarmSent: boolean;
}> {
  const last = await getLatestSchedulerRun('backupFull');
  const lastBackupAt = last?.startedAt ?? null;
  const overdue = isBackupOverdue(lastBackupAt, now.getTime());
  const ageMs = lastBackupAt ? now.getTime() - lastBackupAt.getTime() : null;

  let alarmSent = false;
  if (overdue) {
    await recordSchedulerRun('backupCheck', 'failed', {
      reason: 'backup_overdue',
      maxAgeMs: BACKUP_MAX_AGE_MS,
      lastBackupAt: lastBackupAt?.toISOString() ?? null,
    });
    const channel = await sendBackupAlarm(
      'Backup overdue',
      `No successful full backup within ${BACKUP_MAX_AGE_MS / 3_600_000}h. Last: ${lastBackupAt?.toISOString() ?? 'never'}`,
    );
    alarmSent = channel === 'email';
  } else {
    await recordSchedulerRun('backupCheck', 'ok', {
      lastBackupAt: lastBackupAt?.toISOString() ?? null,
      ageMs,
    });
  }

  return { overdue, lastBackupAt, ageMs, alarmSent };
}
