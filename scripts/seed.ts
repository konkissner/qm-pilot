import { randomUUID } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { hashPassword } from 'better-auth/crypto';
import { authenticator } from 'otplib';
import { ROLE_KEYS, ROLE_LABELS, auditorDefaultVisibleModules, type RoleKey } from '../src/lib/permissions';
import { hashPin } from '../src/lib/auth/pin';
import { getAuthForTenant } from '../src/lib/auth/config';

const prisma = new PrismaClient();
const TENANT_SLUG = 'pharmazeutika-73-3';
const TENANT_NAME = 'Pharmazeutika 73.3 GmbH';
const DOMAIN = 'pharmazeutika.net';
/** Documented example PIN for dev/kiosk. */
export const EXTERNAL_PIN = '4711';
export const DEV_USER_PASSWORD = process.env.DEV_USER_PASSWORD ?? 'DevPassword12!';
/** Populated during seed when Lena TOTP is enabled — also written to e2e/.totp-secret */
export let LENA_TOTP_SECRET = '';

interface SeedUser {
  email?: string;
  firstName: string;
  lastName: string;
  initials: string;
  roleKeys: RoleKey[];
  pinHash?: string;
  totp?: boolean;
}

const SEED_USERS: SeedUser[] = [
  { email: `m.hofer@${DOMAIN}`, firstName: 'Michael', lastName: 'Hofer', initials: 'MH', roleKeys: ['gl'] },
  { email: `l.frei@${DOMAIN}`, firstName: 'Lena', lastName: 'Frei', initials: 'LF', roleKeys: ['rp', 'qmb'], totp: true },
  { email: `s.klein@${DOMAIN}`, firstName: 'Sara', lastName: 'Klein', initials: 'SK', roleKeys: ['deputyRp', 'deputyQmb'] },
  { email: `j.reuter@${DOMAIN}`, firstName: 'Jana', lastName: 'Reuter', initials: 'JR', roleKeys: ['warehouse'] },
  { email: `p.brandt@${DOMAIN}`, firstName: 'Paul', lastName: 'Brandt', initials: 'PB', roleKeys: ['service'] },
  { firstName: 'Ana', lastName: 'Ilic', initials: 'AI', roleKeys: ['external'], pinHash: hashPin(EXTERNAL_PIN) },
  { email: 'audit@extern.example', firstName: 'Auditor', lastName: 'extern', initials: 'AU', roleKeys: ['auditor'] },
  { email: `it@${DOMAIN}`, firstName: 'Admin', lastName: 'IT', initials: 'AD', roleKeys: ['admin'] },
  { email: `t.berger@${DOMAIN}`, firstName: 'Tom', lastName: 'Berger', initials: 'TB', roleKeys: ['warehouse'] },
  { email: `j.weiss@${DOMAIN}`, firstName: 'Jonas', lastName: 'Weiß', initials: 'JW', roleKeys: ['warehouse'] },
  { email: `m.sahin@${DOMAIN}`, firstName: 'Mira', lastName: 'Sahin', initials: 'MS', roleKeys: ['warehouse'] },
  { email: `n.kraus@${DOMAIN}`, firstName: 'Nadia', lastName: 'Kraus', initials: 'NK', roleKeys: ['service'] },
];

function fullName(firstName: string, lastName: string) {
  return `${firstName} ${lastName}`.trim();
}

async function ensureTenant() {
  const existing = await prisma.tenant.findUnique({ where: { slug: TENANT_SLUG }, include: { config: true } });
  if (existing) {
    return prisma.tenant.update({
      where: { id: existing.id },
      data: { name: TENANT_NAME },
      include: { config: true },
    });
  }
  return prisma.tenant.create({
    data: {
      name: TENANT_NAME,
      slug: TENANT_SLUG,
      config: {
        create: {
          holidayRegion: 'BW',
          workingDays: [1, 2, 3, 4, 5],
          escalationRpDays: 2,
          escalationGlDays: 10,
          sessionTimeoutMinutes: 30,
          kioskAutoLockSeconds: 60,
          retentionYears: 10,
          motivationTexts: [],
          vacationTexts: [],
          companyName: TENANT_NAME,
          street: 'Güterstraße 12',
          zip: '79106',
          city: 'Freiburg',
          country: 'DE',
          phone: '+49 761 000-100',
          email: `info@${DOMAIN}`,
          legalStatus: 'GmbH',
          freightApprovalRule: 'rpAndQmb',
          brokerChapterNotApplicable: false,
        },
      },
    },
    include: { config: true },
  });
}

async function ensureRoles(tenantId: string) {
  const roleMap = new Map<RoleKey, string>();
  for (const key of ROLE_KEYS) {
    const role = await prisma.role.upsert({
      where: { tenantId_key: { tenantId, key } },
      create: { tenantId, key, label: ROLE_LABELS[key] },
      update: { label: ROLE_LABELS[key] },
    });
    roleMap.set(key, role.id);
  }
  return roleMap;
}

async function ensureCredentialAccount(userId: string, email: string, passwordHash: string) {
  const existing = await prisma.authAccount.findFirst({ where: { userId, providerId: 'credential' } });
  if (existing) {
    await prisma.authAccount.update({ where: { id: existing.id }, data: { password: passwordHash, accountId: email } });
    return;
  }
  await prisma.authAccount.create({
    data: {
      id: randomUUID(),
      userId,
      accountId: email,
      providerId: 'credential',
      password: passwordHash,
    },
  });
}

async function ensureTotp(userId: string, email: string) {
  const existing = await prisma.twoFactor.findUnique({ where: { userId } });
  if (existing?.verified && LENA_TOTP_SECRET) return;

  if (existing) {
    await prisma.twoFactor.delete({ where: { userId } });
    await prisma.user.update({ where: { id: userId }, data: { twoFactorEnabled: false } });
  }

  process.env.BETTER_AUTH_SECRET = process.env.BETTER_AUTH_SECRET ?? 'dev-secret-minimum-32-characters-long';
  process.env.BETTER_AUTH_URL = process.env.BETTER_AUTH_URL ?? 'http://localhost:4321';

  const auth = await getAuthForTenant(prisma);
  const signIn = await auth.api.signInEmail({
    body: { email, password: DEV_USER_PASSWORD },
    asResponse: true,
  });
  if (!signIn.ok) throw new Error('TOTP seed: sign-in failed');

  const cookieHeader = signIn.headers.get('set-cookie') ?? '';
  const sessionCookie = cookieHeader.split(',').map((c) => c.trim().split(';')[0]).join('; ');
  const headers = new Headers({ cookie: sessionCookie });

  const enable = await auth.api.enableTwoFactor({
    body: { password: DEV_USER_PASSWORD },
    headers,
  });
  const secret = new URL(enable.totpURI).searchParams.get('secret');
  if (!secret) throw new Error('TOTP seed: missing secret in totpURI');
  LENA_TOTP_SECRET = secret;
  writeFileSync(resolve(process.cwd(), 'e2e/.totp-secret'), secret, 'utf8');

  const code = authenticator.generate(secret);
  await auth.api.verifyTOTP({ body: { code }, headers });
}

async function upsertUser(tenantId: string, roleMap: Map<RoleKey, string>, seed: SeedUser, passwordHash: string) {
  const roleIds = seed.roleKeys.map((k) => roleMap.get(k)!);
  const name = fullName(seed.firstName, seed.lastName);
  const existing = seed.email
    ? await prisma.user.findUnique({ where: { tenantId_email: { tenantId, email: seed.email } }, include: { roles: true } })
    : await prisma.user.findFirst({ where: { tenantId, email: null, firstName: seed.firstName, lastName: seed.lastName }, include: { roles: true } });

  let user;
  if (existing) {
    const disconnect = existing.roles.map((r) => ({ id: r.id }));
    user = await prisma.user.update({
      where: { id: existing.id },
      data: {
        name,
        firstName: seed.firstName,
        lastName: seed.lastName,
        initials: seed.initials,
        pinHash: seed.pinHash ?? null,
        status: 'active',
        emailVerified: !!seed.email,
        roles: { disconnect, connect: roleIds.map((id) => ({ id })) },
      },
    });
  } else {
    user = await prisma.user.create({
      data: {
        tenantId,
        email: seed.email ?? null,
        name,
        firstName: seed.firstName,
        lastName: seed.lastName,
        initials: seed.initials,
        pinHash: seed.pinHash ?? null,
        status: 'active',
        emailVerified: !!seed.email,
        roles: { connect: roleIds.map((id) => ({ id })) },
      },
    });
  }

  if (seed.email) await ensureCredentialAccount(user.id, seed.email, passwordHash);
  if (seed.totp && seed.email) await ensureTotp(user.id, seed.email);
  return user;
}

async function ensureAuditorInvite(tenantId: string, auditorUserId: string, createdById: string) {
  const existing = await prisma.auditorInvite.findFirst({ where: { userId: auditorUserId } });
  if (existing) return existing;
  const now = new Date();
  const validUntil = new Date(now);
  validUntil.setDate(validUntil.getDate() + 14);
  return prisma.auditorInvite.create({
    data: {
      tenantId,
      auditorName: 'Auditor · extern',
      userId: auditorUserId,
      validFrom: now,
      validUntil,
      visibleModules: auditorDefaultVisibleModules(),
      createdById,
      status: 'active',
    },
  });
}

export async function runSeed() {
  const passwordHash = await hashPassword(DEV_USER_PASSWORD);
  const tenant = await ensureTenant();
  const roleMap = await ensureRoles(tenant.id);
  for (const seed of SEED_USERS) await upsertUser(tenant.id, roleMap, seed, passwordHash);
  const gl = await prisma.user.findUniqueOrThrow({ where: { tenantId_email: { tenantId: tenant.id, email: `m.hofer@${DOMAIN}` } } });
  const auditor = await prisma.user.findUniqueOrThrow({ where: { tenantId_email: { tenantId: tenant.id, email: 'audit@extern.example' } } });
  await ensureAuditorInvite(tenant.id, auditor.id, gl.id);
  const [tenantCount, roleCount, userCount] = await Promise.all([
    prisma.tenant.count(),
    prisma.role.count({ where: { tenantId: tenant.id } }),
    prisma.user.count({ where: { tenantId: tenant.id } }),
  ]);
  return { tenantCount, roleCount, userCount };
}

async function main() {
  const result = await runSeed();
  console.log(`Seed complete: ${result.tenantCount} tenant(s), ${result.roleCount} roles, ${result.userCount} users`);
}

const isDirectRun = process.argv[1]?.endsWith('/seed.ts') || process.argv[1]?.endsWith('\\seed.ts');
if (isDirectRun) {
  main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
}
