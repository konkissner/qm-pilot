import type { Prisma, SchedulerRunKind, SchedulerRunStatus } from '@prisma/client';
import { prisma } from './db';

export type SchedulerRunDetail = Record<string, unknown>;

export async function startSchedulerRun(
  kind: SchedulerRunKind,
  detail?: SchedulerRunDetail,
): Promise<string> {
  const run = await prisma.schedulerRun.create({
    data: {
      kind,
      status: 'ok',
      detail: detail === undefined ? undefined : (detail as Prisma.InputJsonValue),
    },
  });
  return run.id;
}

export async function finishSchedulerRun(
  id: string,
  status: SchedulerRunStatus,
  detail?: SchedulerRunDetail,
): Promise<void> {
  const existing = await prisma.schedulerRun.findUnique({ where: { id } });
  const mergedDetail =
    existing?.detail && detail
      ? { ...(existing.detail as Prisma.JsonObject), ...detail }
      : (detail ?? existing?.detail ?? undefined);

  await prisma.schedulerRun.update({
    where: { id },
    data: {
      finishedAt: new Date(),
      status,
      detail: mergedDetail === undefined ? undefined : (mergedDetail as Prisma.InputJsonValue),
    },
  });
}

export async function recordSchedulerRun(
  kind: SchedulerRunKind,
  status: SchedulerRunStatus,
  detail?: SchedulerRunDetail,
): Promise<string> {
  const run = await prisma.schedulerRun.create({
    data: {
      kind,
      status,
      finishedAt: new Date(),
      detail: detail === undefined ? undefined : (detail as Prisma.InputJsonValue),
    },
  });
  return run.id;
}

export async function getLatestSchedulerRun(kind: SchedulerRunKind) {
  return prisma.schedulerRun.findFirst({
    where: { kind, status: 'ok' },
    orderBy: { startedAt: 'desc' },
  });
}
