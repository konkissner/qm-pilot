import type { SchedulerRunKind } from '@prisma/client';
import { prisma } from './db';
import { getLatestSchedulerRun } from './scheduler-run';

export const WORKER_HEARTBEAT_MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes
export const BACKUP_MAX_AGE_MS = 26 * 60 * 60 * 1000; // 26 hours

export type HealthComponentStatus = 'ok' | 'degraded' | 'down';

export interface HealthCheckResult {
  status: 'ok' | 'degraded' | 'down';
  timestamp: string;
  components: {
    app: HealthComponentStatus;
    database: HealthComponentStatus;
    worker: HealthComponentStatus;
    backup: HealthComponentStatus;
  };
  details: {
    workerLastHeartbeatAt: string | null;
    workerAgeMs: number | null;
    backupLastSuccessAt: string | null;
    backupAgeMs: number | null;
  };
}

function ageMs(since: Date | null | undefined): number | null {
  if (!since) return null;
  return Date.now() - since.getTime();
}

function componentFromAge(age: number | null, maxAge: number): HealthComponentStatus {
  if (age === null) return 'degraded';
  return age <= maxAge ? 'ok' : 'degraded';
}

export async function checkHealth(): Promise<HealthCheckResult> {
  let database: HealthComponentStatus = 'down';
  try {
    await prisma.$queryRaw`SELECT 1`;
    database = 'ok';
  } catch {
    database = 'down';
  }

  const workerRun = await getLatestSchedulerRun('workerTick' satisfies SchedulerRunKind);
  const backupRun = await getLatestSchedulerRun('backupFull' satisfies SchedulerRunKind);

  const workerAge = ageMs(workerRun?.startedAt);
  const backupAge = ageMs(backupRun?.startedAt);

  const worker = componentFromAge(workerAge, WORKER_HEARTBEAT_MAX_AGE_MS);
  const backup = componentFromAge(backupAge, BACKUP_MAX_AGE_MS);

  const components = {
    app: 'ok' as HealthComponentStatus,
    database,
    worker,
    backup,
  };

  const values = Object.values(components);
  let status: HealthCheckResult['status'] = 'ok';
  if (values.includes('down')) {
    status = 'down';
  } else if (values.includes('degraded')) {
    status = 'degraded';
  }

  return {
    status,
    timestamp: new Date().toISOString(),
    components,
    details: {
      workerLastHeartbeatAt: workerRun?.startedAt?.toISOString() ?? null,
      workerAgeMs: workerAge,
      backupLastSuccessAt: backupRun?.startedAt?.toISOString() ?? null,
      backupAgeMs: backupAge,
    },
  };
}

export function isBackupOverdue(lastBackupAt: Date | null | undefined, now = Date.now()): boolean {
  if (!lastBackupAt) return true;
  return now - lastBackupAt.getTime() > BACKUP_MAX_AGE_MS;
}
