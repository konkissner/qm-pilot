import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  recordSchedulerRun,
  getLatestSchedulerRun,
  startSchedulerRun,
  finishSchedulerRun,
} from './scheduler-run';

const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockFindUnique = vi.fn();
const mockFindFirst = vi.fn();

vi.mock('./db', () => ({
  prisma: {
    schedulerRun: {
      create: (...args: unknown[]) => mockCreate(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
    },
  },
}));

describe('scheduler-run', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreate.mockResolvedValue({ id: 'run_1' });
    mockFindUnique.mockResolvedValue({ id: 'run_1', detail: { phase: 'start' } });
    mockUpdate.mockResolvedValue({});
    mockFindFirst.mockResolvedValue({ id: 'run_latest', startedAt: new Date() });
  });

  it('records a completed run in one step', async () => {
    const id = await recordSchedulerRun('backupFull', 'ok', { sizeBytes: 1024 });
    expect(id).toBe('run_1');
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          kind: 'backupFull',
          status: 'ok',
          finishedAt: expect.any(Date),
        }),
      }),
    );
  });

  it('starts and finishes a run with merged detail', async () => {
    const id = await startSchedulerRun('workerTick');
    expect(id).toBe('run_1');
    await finishSchedulerRun(id, 'ok', { tick: true });
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'run_1' },
        data: expect.objectContaining({
          status: 'ok',
          finishedAt: expect.any(Date),
        }),
      }),
    );
  });

  it('fetches latest successful run by kind', async () => {
    const run = await getLatestSchedulerRun('workerTick');
    expect(run?.id).toBe('run_latest');
    expect(mockFindFirst).toHaveBeenCalledWith({
      where: { kind: 'workerTick', status: 'ok' },
      orderBy: { startedAt: 'desc' },
    });
  });
});
