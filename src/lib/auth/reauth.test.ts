import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createReAuthVerifier } from './reauth';
import { PrismaClient } from '@prisma/client';
import { hashPassword } from 'better-auth/crypto';
import { hashPin } from './pin';
import { randomUUID } from 'node:crypto';

describe.runIf(!!process.env.DATABASE_URL)('ReAuthVerifier', () => {
  const prisma = new PrismaClient();
  let tenantId = '';
  let passwordUserId = '';
  let pinUserId = '';

  beforeAll(async () => {
    const tenant = await prisma.tenant.create({
      data: {
        name: 'ReAuth',
        slug: `reauth-${Date.now()}`,
        config: { create: {} },
        roles: { create: [{ key: 'external', label: 'Ext' }] },
      },
      include: { roles: true },
    });
    tenantId = tenant.id;
    const passwordHash = await hashPassword('DevPassword12!');
    const pwUser = await prisma.user.create({
      data: {
        tenantId,
        email: `pw-${Date.now()}@example.com`,
        name: 'PW User',
        firstName: 'PW',
        lastName: 'User',
        authAccounts: {
          create: { id: randomUUID(), accountId: 'pw', providerId: 'credential', password: passwordHash },
        },
      },
    });
    passwordUserId = pwUser.id;
    const extRole = tenant.roles[0];
    const pinUser = await prisma.user.create({
      data: {
        tenantId,
        name: 'PIN User',
        firstName: 'PIN',
        lastName: 'User',
        pinHash: hashPin('4711'),
        roles: { connect: { id: extRole.id } },
      },
    });
    pinUserId = pinUser.id;
  });

  afterAll(async () => {
    await prisma.tenant.deleteMany({ where: { id: tenantId } });
    await prisma.$disconnect();
  });

  it('verifies password and PIN paths', async () => {
    const verifier = createReAuthVerifier(prisma);
    expect(await verifier.verify(passwordUserId, 'DevPassword12!')).toBe(true);
    expect(await verifier.verify(passwordUserId, 'wrong')).toBe(false);
    expect(await verifier.verify(pinUserId, '4711')).toBe(true);
    expect(await verifier.verify(pinUserId, '0000')).toBe(false);
  });
});
