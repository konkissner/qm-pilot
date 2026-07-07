import { prisma } from './lib/db';
import { recordSchedulerRun, startSchedulerRun, finishSchedulerRun } from './lib/scheduler-run';
import { checkBackupFreshness } from './lib/backup-monitor';

const TICK_INTERVAL_MS = Number(process.env.WORKER_TICK_INTERVAL_MS ?? '60_000');
const BACKUP_CHECK_INTERVAL_MS = Number(process.env.BACKUP_CHECK_INTERVAL_MS ?? '3_600_000');

let running = true;
let tickInFlight = false;

function shutdown(signal: string) {
  if (!running) return;
  running = false;
  console.log(`worker shutting down (${signal})`);
  void prisma.$disconnect().finally(() => process.exit(0));
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

async function workerTick(): Promise<void> {
  if (tickInFlight) return;
  tickInFlight = true;
  const runId = await startSchedulerRun('workerTick');
  try {
    // Scheduler jobs (task generation, escalation) — WP-10
    await finishSchedulerRun(runId, 'ok', { intervalMs: TICK_INTERVAL_MS });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await finishSchedulerRun(runId, 'failed', { error: message });
    console.error('worker tick failed:', message);
  } finally {
    tickInFlight = false;
  }
}

async function backupCheck(): Promise<void> {
  try {
    const result = await checkBackupFreshness();
    if (result.overdue) {
      console.warn('backup freshness check: overdue', result);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await recordSchedulerRun('backupCheck', 'failed', { error: message });
    console.error('backup check failed:', message);
  }
}

console.log(`worker up (tick=${TICK_INTERVAL_MS}ms)`);

void workerTick();
void backupCheck();

setInterval(() => {
  if (!running) return;
  void workerTick();
}, TICK_INTERVAL_MS);

setInterval(() => {
  if (!running) return;
  void backupCheck();
}, BACKUP_CHECK_INTERVAL_MS);
