import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  WORKER_HEARTBEAT_MAX_AGE_MS,
  BACKUP_MAX_AGE_MS,
  checkHealth,
  isBackupOverdue,
} from './health';

const mockQueryRaw = vi.fn();
const mockGetLatest = vi.fn();

vi.mock('./db', () => ({
  prisma: {
    $queryRaw: (...args: unknown[]) => mockQueryRaw(...args),
  },
}));

vi.mock('./scheduler-run', () => ({
  getLatestSchedulerRun: (...args: unknown[]) => mockGetLatest(...args),
}));

describe('health', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQueryRaw.mockResolvedValue([{ '?column?': 1 }]);
  });

  it('reports ok when DB and heartbeats are fresh', async () => {
    const now = new Date();
    mockGetLatest.mockImplementation(async (kind: string) => {
      if (kind === 'workerTick' || kind === 'backupFull') {
        return { startedAt: now };
      }
      return null;
    });

    const result = await checkHealth();
    expect(result.status).toBe('ok');
    expect(result.components.database).toBe('ok');
    expect(result.components.worker).toBe('ok');
    expect(result.components.backup).toBe('ok');
  });

  it('reports degraded when worker heartbeat is stale', async () => {
    const stale = new Date(Date.now() - WORKER_HEARTBEAT_MAX_AGE_MS - 1000);
    mockGetLatest.mockImplementation(async (kind: string) => {
      if (kind === 'workerTick') return { startedAt: stale };
      if (kind === 'backupFull') return { startedAt: new Date() };
      return null;
    });

    const result = await checkHealth();
    expect(result.status).toBe('degraded');
    expect(result.components.worker).toBe('degraded');
  });

  it('reports degraded when backup is older than 26h', async () => {
    const staleBackup = new Date(Date.now() - BACKUP_MAX_AGE_MS - 1000);
    mockGetLatest.mockImplementation(async (kind: string) => {
      if (kind === 'workerTick') return { startedAt: new Date() };
      if (kind === 'backupFull') return { startedAt: staleBackup };
      return null;
    });

    const result = await checkHealth();
    expect(result.status).toBe('degraded');
    expect(result.components.backup).toBe('degraded');
  });

  it('reports down when database is unreachable', async () => {
    mockQueryRaw.mockRejectedValue(new Error('connection refused'));
    mockGetLatest.mockResolvedValue(null);

    const result = await checkHealth();
    expect(result.status).toBe('down');
    expect(result.components.database).toBe('down');
  });

  it('isBackupOverdue detects missing and stale backups', () => {
    expect(isBackupOverdue(null)).toBe(true);
    const fresh = new Date(Date.now() - 1000);
    expect(isBackupOverdue(fresh)).toBe(false);
    const stale = new Date(Date.now() - BACKUP_MAX_AGE_MS - 1);
    expect(isBackupOverdue(stale)).toBe(true);
  });
});
