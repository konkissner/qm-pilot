import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { validatePinFormat, hashPin, verifyPinCredential } from './pin';
import { throttleDelayMs } from './constants';
import { PrismaClient } from '@prisma/client';

describe('PIN rules', () => {
  it('rejects trivial PINs', () => {
    expect(validatePinFormat('1234')).toMatch(/einfach/);
    expect(validatePinFormat('0000')).toMatch(/einfach/);
  });

  it('accepts non-trivial 4-digit PIN', () => {
    expect(validatePinFormat('4711')).toBeNull();
  });

  it('throttles on 3rd and 4th attempt', () => {
    expect(throttleDelayMs(3)).toBe(5000);
    expect(throttleDelayMs(4)).toBe(15000);
    expect(throttleDelayMs(2)).toBe(0);
  });
});

describe.runIf(!!process.env.DATABASE_URL)('PIN state machine', () => {
  const prisma = new PrismaClient();
  let tenantId = '';
  let userId = '';

  beforeAll(async () => {
    const tenant = await prisma.tenant.create({
      data: { name: 'PIN', slug: `pin-${Date.now()}`, config: { create: {} } },
    });
    tenantId = tenant.id;
    const user = await prisma.user.create({
      data: {
        tenantId,
        name: 'PIN User',
        firstName: 'PIN',
        lastName: 'User',
        pinHash: hashPin('4711'),
      },
    });
    userId = user.id;
  });

  afterAll(async () => {
    await prisma.tenant.deleteMany({ where: { id: tenantId } });
    await prisma.$disconnect();
  });

  it('locks after 5 failures', async () => {
    for (let i = 1; i <= 4; i++) {
      const r = await verifyPinCredential(prisma, userId, '0000');
      expect(r.ok).toBe(false);
      expect(r.failedAttempts).toBe(i);
    }
    const locked = await verifyPinCredential(prisma, userId, '0000');
    expect(locked.locked).toBe(true);
    expect(locked.pinLockedUntil).not.toBeNull();
  });

  it('resets counters on successful PIN', async () => {
    await prisma.user.update({
      where: { id: userId },
      data: { pinFailedAttempts: 2, pinLockedUntil: null },
    });
    const ok = await verifyPinCredential(prisma, userId, '4711');
    expect(ok.ok).toBe(true);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(user.pinFailedAttempts).toBe(0);
    expect(user.pinLockedUntil).toBeNull();
  });
});
