import { afterAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { runSeed } from './seed';

const prisma = new PrismaClient();
describe.runIf(!!process.env.DATABASE_URL)('seed idempotency', () => {
  afterAll(() => prisma.$disconnect());
  it('2x seed => 1 tenant, 10 roles, 12 users', async () => {
    await runSeed();
    await runSeed();
    const tenant = await prisma.tenant.findUnique({ where: { slug: 'pharmazeutika-73-3' }, include: { _count: { select: { roles: true, users: true } } } });
    expect(tenant).not.toBeNull();
    expect(tenant!._count.roles).toBe(10);
    expect(tenant!._count.users).toBe(12);
  });
});
