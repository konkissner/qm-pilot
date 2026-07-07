import type { Prisma, PrismaClient } from '@prisma/client';
import { canViewAuditTrail, type RoleKey } from '../permissions';
import { summarizeDiff } from './diff';

export interface AuditQueryFilter {
  tenantId: string;
  actorRoleKeys: RoleKey[];
  userId?: string;
  from?: Date;
  to?: Date;
  objectType?: string;
  objectId?: string;
  action?: string;
  search?: string;
  cursor?: string;
  limit?: number;
}

export interface AuditQueryRow {
  id: string;
  occurredAt: Date;
  userId: string;
  userNameSnapshot: string;
  action: string;
  actionLabel: string;
  objectType: string;
  objectId: string;
  objectLabel: string;
  diff: Prisma.JsonValue | null;
  context: Prisma.JsonValue | null;
  severity: string;
}

export interface AuditQueryResult {
  items: AuditQueryRow[];
  nextCursor: string | null;
}

const BERLIN_TZ = 'Europe/Berlin';

export function formatBerlinTimestamp(date: Date): string {
  return new Intl.DateTimeFormat('de-DE', {
    timeZone: BERLIN_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);
}

function assertAuditReadAccess(roleKeys: RoleKey[]): void {
  if (!canViewAuditTrail({ roleKeys })) {
    throw new Error('Keine Berechtigung für Audit-Trail-Einsicht.');
  }
}

function buildWhere(filter: AuditQueryFilter): Prisma.AuditEventWhereInput {
  const where: Prisma.AuditEventWhereInput = { tenantId: filter.tenantId };
  if (filter.userId) where.userId = filter.userId;
  if (filter.action) where.action = filter.action;
  if (filter.objectType) where.objectType = filter.objectType;
  if (filter.objectId) where.objectId = filter.objectId;
  if (filter.from || filter.to) {
    where.occurredAt = {};
    if (filter.from) where.occurredAt.gte = filter.from;
    if (filter.to) where.occurredAt.lte = filter.to;
  }
  if (filter.search?.trim()) {
    const q = filter.search.trim();
    where.OR = [
      { objectLabel: { contains: q, mode: 'insensitive' } },
      { actionLabel: { contains: q, mode: 'insensitive' } },
      { userNameSnapshot: { contains: q, mode: 'insensitive' } },
    ];
  }
  return where;
}

export async function queryAuditEvents(db: PrismaClient, filter: AuditQueryFilter): Promise<AuditQueryResult> {
  assertAuditReadAccess(filter.actorRoleKeys);
  const limit = Math.min(Math.max(filter.limit ?? 50, 1), 200);
  const rows = await db.auditEvent.findMany({
    where: buildWhere(filter),
    orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
    take: limit + 1,
    ...(filter.cursor ? { cursor: { id: filter.cursor }, skip: 1 } : {}),
  });

  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  return {
    items,
    nextCursor: hasMore ? items[items.length - 1]!.id : null,
  };
}

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function contextSummary(context: Prisma.JsonValue | null): string {
  if (!context || typeof context !== 'object' || Array.isArray(context)) return '';
  const record = context as Record<string, unknown>;
  const parts = [record.ip, record.kioskDeviceId, record.userAgent].filter(Boolean).map(String);
  return parts.join(' / ');
}

export function formatAuditCsvRow(row: AuditQueryRow): string {
  const diff =
    row.diff && typeof row.diff === 'object' && !Array.isArray(row.diff)
      ? summarizeDiff(row.diff as Record<string, { old: unknown; new: unknown }>)
      : '';
  return [
    formatBerlinTimestamp(row.occurredAt),
    row.userNameSnapshot,
    row.actionLabel,
    `${row.objectType}: ${row.objectLabel}`,
    diff,
    contextSummary(row.context),
  ]
    .map(csvEscape)
    .join(',');
}

export const AUDIT_CSV_HEADER =
  'Zeitpunkt,Person,Aktion,Objekt,Diff-Zusammenfassung,IP/Gerät';

export async function exportAuditCsv(db: PrismaClient, filter: AuditQueryFilter): Promise<string> {
  assertAuditReadAccess(filter.actorRoleKeys);
  const lines = [AUDIT_CSV_HEADER];
  let cursor = filter.cursor;
  for (;;) {
    const page = await queryAuditEvents(db, { ...filter, cursor, limit: 200 });
    for (const row of page.items) lines.push(formatAuditCsvRow(row));
    if (!page.nextCursor) break;
    cursor = page.nextCursor;
  }
  return `${lines.join('\n')}\n`;
}
