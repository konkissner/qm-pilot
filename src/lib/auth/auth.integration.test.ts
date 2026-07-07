import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { hashPassword } from 'better-auth/crypto';
import { randomUUID } from 'node:crypto';
import { retireUser } from '../services/users';
import { resolveAppSession } from './session-resolver';
import { getAuthForTenant } from './config';
import { hashPin } from './pin';
import { registerKioskDevice } from './kiosk-device';
import { attemptKioskPinLogin } from './kiosk-session';

const prisma = new PrismaClient();
const run = !!process.env.DATABASE_URL;

function mockCookies(values: Record<string, string>) {
  return {
    get: (name: string) => (values[name] ? { value: values[name] } : undefined),
    delete: () => undefined,
    set: () => undefined,
  } as never;
}

describe.runIf(run)('access revoked on retire (R-007)', () => {
  let tenantId = '';
  let glId = '';
  let janaId = '';
  let sessionToken = '';

  beforeAll(async () => {
    process.env.BETTER_AUTH_SECRET = process.env.BETTER_AUTH_SECRET ?? 'test-secret-32chars-minimum!!!!';
    process.env.BETTER_AUTH_URL = process.env.BETTER_AUTH_URL ?? 'http://localhost:4321';
    const tenant = await prisma.tenant.create({
      data: {
        name: 'Auth',
        slug: `auth-${Date.now()}`,
        config: { create: { sessionTimeoutMinutes: 30, kioskAutoLockSeconds: 60 } },
        roles: { create: [{ key: 'gl', label: 'GL' }, { key: 'warehouse', label: 'Lager' }] },
      },
      include: { roles: true },
    });
    tenantId = tenant.id;
    process.env.DEFAULT_TENANT_SLUG = tenant.slug;
    const glRole = tenant.roles.find((r) => r.key === 'gl')!;
    const whRole = tenant.roles.find((r) => r.key === 'warehouse')!;
    const passwordHash = await hashPassword('DevPassword12!');
    const gl = await prisma.user.create({
      data: {
        tenantId,
        email: `gl-${Date.now()}@example.com`,
        name: 'GL User',
        firstName: 'GL',
        lastName: 'User',
        roles: { connect: { id: glRole.id } },
        authAccounts: { create: { id: randomUUID(), accountId: 'gl', providerId: 'credential', password: passwordHash } },
      },
    });
    glId = gl.id;
    const jana = await prisma.user.create({
      data: {
        tenantId,
        email: `jana-${Date.now()}@example.com`,
        name: 'Jana Reuter',
        firstName: 'Jana',
        lastName: 'Reuter',
        roles: { connect: { id: whRole.id } },
        authAccounts: { create: { id: randomUUID(), accountId: 'jana', providerId: 'credential', password: passwordHash } },
      },
    });
    janaId = jana.id;
    const auth = await getAuthForTenant(prisma);
    const res = await auth.api.signInEmail({
      body: { email: jana.email!, password: 'DevPassword12!' },
      returnHeaders: true,
    });
    const setCookie = res.headers?.get('set-cookie') ?? '';
    const match = setCookie.match(/qm_pilot\.session_token=([^;]+)/);
    sessionToken = match?.[1] ?? '';
    expect(sessionToken).not.toBe('');
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('invalidates session on next resolve after retire', async () => {
    const headers = new Headers({ cookie: `qm_pilot.session_token=${sessionToken}` });
    const before = await resolveAppSession(prisma, { cookies: mockCookies({}), headers });
    expect(before?.user.id).toBe(janaId);

    await retireUser(prisma, { id: glId, tenantId, roleKeys: ['gl'] }, janaId);
    const after = await resolveAppSession(prisma, { cookies: mockCookies({}), headers });
    expect(after).toBeNull();
    const sessions = await prisma.authSession.count({ where: { userId: janaId } });
    expect(sessions).toBe(0);
  });
});

describe.runIf(run)('kiosk PIN login blocked for retired user', () => {
  let tenantId = '';
  let userId = '';
  let deviceId = '';
  let glId = '';

  beforeAll(async () => {
    const tenant = await prisma.tenant.create({
      data: {
        name: 'KioskRetire',
        slug: `kret-${Date.now()}`,
        config: { create: { kioskAutoLockSeconds: 60 } },
        roles: { create: [{ key: 'gl', label: 'GL' }, { key: 'external', label: 'Ext' }] },
      },
      include: { roles: true },
    });
    tenantId = tenant.id;
    glId = tenant.roles.find((r) => r.key === 'gl')!.id;
    const extRole = tenant.roles.find((r) => r.key === 'external')!;
    const gl = await prisma.user.create({
      data: { tenantId, email: `gl2-${Date.now()}@example.com`, name: 'GL2', firstName: 'GL', lastName: '2', roles: { connect: { id: glId } } },
    });
    const user = await prisma.user.create({
      data: {
        tenantId,
        name: 'Ext',
        firstName: 'Ext',
        lastName: 'User',
        pinHash: hashPin('4711'),
        roles: { connect: { id: extRole.id } },
      },
    });
    userId = user.id;
    const { deviceId: d } = await registerKioskDevice(prisma, { id: gl.id, tenantId }, 'Testgerät');
    deviceId = d;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('rejects PIN after retire', async () => {
    await prisma.user.update({ where: { id: userId }, data: { status: 'retired', retiredAt: new Date() } });
    const result = await attemptKioskPinLogin(prisma, {
      userId,
      tenantId,
      kioskDeviceId: deviceId,
      pin: '4711',
      autoLockSeconds: 60,
    });
    expect(result.ok).toBe(false);
  });
});
