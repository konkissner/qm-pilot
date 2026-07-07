import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { getEnhancedPrisma } from './db-enhanced';
import { assignRole, retireUser, UserServiceForbiddenError } from './services/users';

const prisma = new PrismaClient();
const run = !!process.env.DATABASE_URL;

describe.runIf(run)('ZenStack tenant isolation', () => {
  let tenantAId = '', tenantBId = '', userAId = '';
  beforeAll(async () => {
    const tenantA = await prisma.tenant.create({ data: { name: 'A', slug: `iso-a-${Date.now()}`, config: { create: {} }, roles: { create: [{ key: 'gl', label: 'GL' }] } }, include: { roles: true } });
    const tenantB = await prisma.tenant.create({ data: { name: 'B', slug: `iso-b-${Date.now()}`, config: { create: {} }, roles: { create: [{ key: 'gl', label: 'GL' }] } }, include: { roles: true } });
    tenantAId = tenantA.id; tenantBId = tenantB.id;
    const userA = await prisma.user.create({ data: { tenantId: tenantAId, email: `a-${Date.now()}@example.com`, firstName: 'A', lastName: 'U', roles: { connect: { id: tenantA.roles[0].id } } } });
    userAId = userA.id;
  });
  afterAll(async () => { await prisma.tenant.deleteMany({ where: { id: { in: [tenantAId, tenantBId] } } }); await prisma.$disconnect(); });
  it('blocks cross-tenant read', async () => { const db = getEnhancedPrisma({ id: userAId, tenantId: tenantAId, status: 'active' }); expect(await db.user.findMany({ where: { tenantId: tenantBId } })).toHaveLength(0); });
  it('blocks cross-tenant write', async () => { const db = getEnhancedPrisma({ id: userAId, tenantId: tenantAId, status: 'active' }); await expect(db.user.create({ data: { tenantId: tenantBId, email: `x-${Date.now()}@example.com`, firstName: 'X', lastName: 'Y' } })).rejects.toThrow(); });
});

describe.runIf(run)('users service', () => {
  let tenantId = '', glId = '', qmbId = '', targetId = '', rpRoleId = '';
  beforeAll(async () => {
    const tenant = await prisma.tenant.create({ data: { name: 'Svc', slug: `svc-${Date.now()}`, config: { create: {} }, roles: { create: [{ key: 'gl', label: 'GL' }, { key: 'qmb', label: 'QMB' }, { key: 'rp', label: 'RP' }] } }, include: { roles: true } });
    tenantId = tenant.id; rpRoleId = tenant.roles.find((r) => r.key === 'rp')!.id;
    const gl = await prisma.user.create({ data: { tenantId, email: `gl-${Date.now()}@example.com`, firstName: 'GL', lastName: 'U', roles: { connect: { id: tenant.roles.find((r) => r.key === 'gl')!.id } } } });
    const qmb = await prisma.user.create({ data: { tenantId, email: `qmb-${Date.now()}@example.com`, firstName: 'QMB', lastName: 'U', roles: { connect: { id: tenant.roles.find((r) => r.key === 'qmb')!.id } } } });
    const target = await prisma.user.create({ data: { tenantId, email: `t-${Date.now()}@example.com`, firstName: 'T', lastName: 'U' } });
    glId = gl.id; qmbId = qmb.id; targetId = target.id;
  });
  afterAll(async () => { await prisma.$disconnect(); });
  it('retire not delete', async () => { await retireUser(prisma, { id: glId, tenantId, roleKeys: ['gl'] }, targetId); const u = await prisma.user.findUniqueOrThrow({ where: { id: targetId } }); expect(u.status).toBe('retired'); expect(u.retiredAt).not.toBeNull(); });
  it('reject rp by QMB', async () => { const t = await prisma.user.create({ data: { tenantId, email: `f-${Date.now()}@example.com`, firstName: 'F', lastName: 'U' } }); await expect(assignRole(prisma, { id: qmbId, tenantId, roleKeys: ['qmb'] }, t.id, 'rp')).rejects.toBeInstanceOf(UserServiceForbiddenError); });
  it('allow rp by GL', async () => { const t = await prisma.user.create({ data: { tenantId, email: `g-${Date.now()}@example.com`, firstName: 'G', lastName: 'U' } }); await assignRole(prisma, { id: glId, tenantId, roleKeys: ['gl'] }, t.id, 'rp'); const u = await prisma.user.findUniqueOrThrow({ where: { id: t.id }, include: { roles: true } }); expect(u.roles.some((r) => r.id === rpRoleId)).toBe(true); });
});
