-- CreateEnum
CREATE TYPE "SchedulerRunKind" AS ENUM ('workerTick', 'backupFull', 'backupCheck', 'walArchiveCheck');

-- CreateEnum
CREATE TYPE "SchedulerRunStatus" AS ENUM ('ok', 'failed');

-- CreateTable
CREATE TABLE "SchedulerRun" (
    "id" TEXT NOT NULL,
    "kind" "SchedulerRunKind" NOT NULL,
    "startedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMPTZ,
    "status" "SchedulerRunStatus" NOT NULL,
    "detail" JSONB,

    CONSTRAINT "SchedulerRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SchedulerRun_kind_startedAt_idx" ON "SchedulerRun"("kind", "startedAt" DESC);

-- CreateIndex
CREATE INDEX "SchedulerRun_status_startedAt_idx" ON "SchedulerRun"("status", "startedAt" DESC);
