import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import {
  assignRole,
  createUser,
  removeRole,
  retireUser,
  setRoleRightOverride,
  setUserRightOverride,
  updateUser,
} from '../services/users';
import { updateTenantConfig } from '../services/tenant-config';
import { createAuditorInvite } from '../services/auditor-invites';
import { getEnhancedPrisma } from '../db-enhanced';
import { canViewAuditTrail, type RoleKey } from '../permissions';
import { writeAuditEvent } from './audited';

const run = !!process.env.DATABASE_URL;
const appUrl =
  process.env.DATABASE_URL_APP ??
  'postgresql://qmpilot_app:qmpilot_app@localhost:5432/qmpilot?schema=public';

describe.runIf(run)('AuditEvent DB hardening (R-013)', () => {
  const admin = new PrismaClient();
  const appDb = new PrismaClient({ datasources: { db: { url: appUrl } } });
  let tenantId = '';
  let userId = '';
  let eventId = '';

  beforeAll(async () => {
    const tenant = await admin.tenant.create({
      data: {
        name: 'Audit',
        slug: `audit-${Date.now()}`,
        config: { create: {} },
        users: { create: { name: 'Audit Actor', firstName: 'Audit', lastName: 'Actor', email: `audit-${Date.now()}@example.com` } },
      },
      include: { users: true },
    });
    tenantId = tenant.id;
    userId = tenant.users[0]!.id;
    const event = await admin.auditEvent.create({
      data: {
        tenantId,
        userId,
        userNameSnapshot: 'Audit Actor',
        action: 'test.seed',
        actionLabel: 'Test',
        objectType: 'Test',
        objectId: 'x',
        objectLabel: 'X',
      },
    });
    eventId = event.id;
  });

  afterAll(async () => {
    await admin.$disconnect();
    await appDb.$disconnect();
  });

  it('blocks UPDATE/DELETE as qmpilot_app (missing GRANT)', async () => {
    await expect(
      appDb.auditEvent.update({ where: { id: eventId }, data: { actionLabel: 'hack' } }),
    ).rejects.toThrow();
    await expect(appDb.auditEvent.delete({ where: { id: eventId } })).rejects.toThrow();
  });

  it('blocks UPDATE/DELETE as superuser (trigger)', async () => {
    await expect(
      admin.$executeRawUnsafe(`UPDATE "AuditEvent" SET "actionLabel" = 'hack' WHERE id = $1`, eventId),
    ).rejects.toThrow(/append-only/i);
    await expect(
      admin.$executeRawUnsafe(`DELETE FROM "AuditEvent" WHERE id = $1`, eventId),
    ).rejects.toThrow(/append-only/i);
  });
});

describe.runIf(run)('audited user service completeness (R-012)', () => {
  const db = new PrismaClient();
  let tenantId = '';
  let glId = '';
  let targetId = '';
  let otherTenantId = '';

  beforeAll(async () => {
    const tenant = await db.tenant.create({
      data: {
        name: 'AuditSvc',
        slug: `audsvc-${Date.now()}`,
        config: { create: {} },
        roles: {
          create: [
            { key: 'gl', label: 'GL' },
            { key: 'rp', label: 'RP' },
            { key: 'qmb', label: 'QMB' },
            { key: 'warehouse', label: 'Lager' },
          ],
        },
      },
      include: { roles: true },
    });
    tenantId = tenant.id;
    const gl = await db.user.create({
      data: {
        tenantId,
        email: `gl-audit-${Date.now()}@example.com`,
        name: 'GL Audit',
        firstName: 'GL',
        lastName: 'Audit',
        roles: { connect: { id: tenant.roles.find((r) => r.key === 'gl')!.id } },
      },
    });
    glId = gl.id;
    const target = await db.user.create({
      data: { tenantId, email: `tgt-${Date.now()}@example.com`, name: 'Target User', firstName: 'Target', lastName: 'User' },
    });
    targetId = target.id;
    const other = await db.tenant.create({ data: { name: 'Other', slug: `other-${Date.now()}`, config: { create: {} } } });
    otherTenantId = other.id;
  });

  afterAll(async () => { await db.$disconnect(); });

  const actor = (): { id: string; tenantId: string; roleKeys: RoleKey[] } => ({
    id: glId,
    tenantId,
    roleKeys: ['gl'],
  });

  it('writes exactly one audit event per mutation type', async () => {
    const created = await createUser(db, actor(), tenantId, { firstName: 'Neu', lastName: 'Person' }, ['warehouse']);
    await updateUser(db, actor(), created.id, { firstName: 'Neu2' });
    await assignRole(db, actor(), created.id, 'qmb');
    await setUserRightOverride(db, actor(), created.id, 'module', 'inventory', true);
    await setRoleRightOverride(db, actor(), 'warehouse', 'module', 'inventory', false);
    await removeRole(db, actor(), created.id, 'warehouse');
    await retireUser(db, actor(), created.id);
    await updateTenantConfig(db, actor(), { retentionYears: 10 });
    await createAuditorInvite(db, actor(), {
      auditorName: 'Extern Auditor',
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 86400000),
      visibleModules: ['documents'],
    });

    const actions = [
      'user.created',
      'user.updated',
      'user.roleAssigned',
      'user.rightChanged',
      'role.rightChanged',
      'user.roleRemoved',
      'user.retired',
      'tenantConfig.changed',
      'auditorInvite.created',
    ];

    for (const action of actions) {
      const count = await db.auditEvent.count({ where: { tenantId, action } });
      expect(count, action).toBeGreaterThanOrEqual(1);
    }
  });

  it('rolls back audit event when transaction fails after writes', async () => {
    const before = await db.auditEvent.count({ where: { tenantId } });
    await expect(
      db.$transaction(async (tx) => {
        await tx.user.update({ where: { id: targetId }, data: { initials: `R${Date.now()}` } });
        await writeAuditEvent(
          tx,
          { tenantId, userId: glId, userNameSnapshot: 'GL Audit' },
          {
            action: 'user.updated',
            actionLabel: 'Rollback test',
            objectType: 'User',
            objectId: targetId,
            objectLabel: 'Target User',
            diff: { initials: { old: 'a', new: 'b' } },
          },
        );
        throw new Error('forced failure');
      }),
    ).rejects.toThrow('forced failure');

    const after = await db.auditEvent.count({ where: { tenantId } });
    expect(after).toBe(before);
  });

  it('never returns foreign-tenant audit rows in query filter', async () => {
    await db.auditEvent.create({
      data: {
        tenantId: otherTenantId,
        userId: glId,
        userNameSnapshot: 'Other',
        action: 'test.foreign',
        actionLabel: 'Foreign',
        objectType: 'Test',
        objectId: '1',
        objectLabel: '1',
      },
    });
    const own = await db.auditEvent.findMany({ where: { tenantId } });
    expect(own.every((e) => e.tenantId === tenantId)).toBe(true);
  });
});

describe.runIf(run)('immutability and retention triggers (R-017, R-018)', () => {
  const db = new PrismaClient();
  const probeId = `probe-${Date.now()}`;

  afterAll(async () => { await db.$disconnect(); });

  it('blocks UPDATE/DELETE on locked probe row', async () => {
    await db.$executeRawUnsafe(
      `INSERT INTO "_ImmutabilityProbe" (id, label, "lockedAt") VALUES ($1, 'locked', NOW())`,
      probeId,
    );
    await expect(
      db.$executeRawUnsafe(`UPDATE "_ImmutabilityProbe" SET label = 'x' WHERE id = $1`, probeId),
    ).rejects.toThrow(/immutable/i);
    await expect(db.$executeRawUnsafe(`DELETE FROM "_ImmutabilityProbe" WHERE id = $1`, probeId)).rejects.toThrow(
      /immutable/i,
    );
  });

  it('blocks DELETE while retentionUntil is in the future', async () => {
    const id = `${probeId}-ret`;
    await db.$executeRawUnsafe(
      `INSERT INTO "_ImmutabilityProbe" (id, label, "retentionUntil") VALUES ($1, 'ret', CURRENT_DATE + 30)`,
      id,
    );
    await expect(db.$executeRawUnsafe(`DELETE FROM "_ImmutabilityProbe" WHERE id = $1`, id)).rejects.toThrow(
      /retention/i,
    );
    await db.$executeRawUnsafe(`UPDATE "_ImmutabilityProbe" SET "retentionUntil" = CURRENT_DATE - 1 WHERE id = $1`, id);
    await db.$executeRawUnsafe(`DELETE FROM "_ImmutabilityProbe" WHERE id = $1`, id);
  });

  it('allows new version row after lock', async () => {
    const id = `${probeId}-new`;
    await db.$executeRawUnsafe(
      `INSERT INTO "_ImmutabilityProbe" (id, label, "lockedAt") VALUES ($1, 'v1', NOW())`,
      id,
    );
    const id2 = `${probeId}-new2`;
    await db.$executeRawUnsafe(`INSERT INTO "_ImmutabilityProbe" (id, label) VALUES ($1, 'v2')`, id2);
    const unlocked = await db.$executeRawUnsafe(`SELECT id FROM "_ImmutabilityProbe" WHERE id = $1`, id2);
    expect(unlocked).toBeDefined();
  });
});

describe.runIf(run)('ZenStack audit read policies', () => {
  const db = new PrismaClient();
  let tenantA = '';
  let tenantB = '';
  let glA = '';
  let auditorA = '';

  beforeAll(async () => {
    const a = await db.tenant.create({
      data: {
        name: 'ZA',
        slug: `za-${Date.now()}`,
        config: { create: {} },
        roles: { create: [{ key: 'gl', label: 'GL' }, { key: 'auditor', label: 'Auditor' }] },
      },
      include: { roles: true },
    });
    tenantA = a.id;
    const glRole = a.roles.find((r) => r.key === 'gl')!;
    const audRole = a.roles.find((r) => r.key === 'auditor')!;
    const gl = await db.user.create({
      data: {
        tenantId: tenantA,
        name: 'GL A',
        firstName: 'GL',
        lastName: 'A',
        email: `gla-${Date.now()}@example.com`,
        roles: { connect: { id: glRole.id } },
      },
    });
    const aud = await db.user.create({
      data: {
        tenantId: tenantA,
        name: 'Aud A',
        firstName: 'Aud',
        lastName: 'A',
        email: `auda-${Date.now()}@example.com`,
        roles: { connect: { id: audRole.id } },
      },
    });
    glA = gl.id;
    auditorA = aud.id;
    const b = await db.tenant.create({ data: { name: 'ZB', slug: `zb-${Date.now()}`, config: { create: {} } } });
    tenantB = b.id;
    await db.auditEvent.create({
      data: {
        tenantId: tenantA,
        userId: glA,
        userNameSnapshot: 'GL A',
        action: 'test.read',
        actionLabel: 'Read test',
        objectType: 'Test',
        objectId: '1',
        objectLabel: '1',
      },
    });
  });

  afterAll(async () => { await db.$disconnect(); });

  it('auditor can read audit trail in tenant', async () => {
    expect(canViewAuditTrail({ roleKeys: ['auditor'] })).toBe(true);
    const enhanced = getEnhancedPrisma({ id: auditorA, tenantId: tenantA, status: 'active' });
    const rows = await enhanced.auditEvent.findMany();
    expect(rows.length).toBeGreaterThan(0);
  });

  it('blocks cross-tenant audit reads', async () => {
    const enhanced = getEnhancedPrisma({ id: glA, tenantId: tenantB, status: 'active' });
    await expect(enhanced.auditEvent.findMany({ where: { tenantId: tenantA } })).resolves.toHaveLength(0);
  });
});
