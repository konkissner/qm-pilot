import { createHash } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { ROLE_KEYS, ROLE_LABELS, auditorDefaultVisibleModules, type RoleKey } from '../src/lib/permissions';

const prisma = new PrismaClient();
const TENANT_SLUG = 'pharmazeutika-73-3';
const TENANT_NAME = 'Pharmazeutika 73.3 GmbH';
const DOMAIN = 'pharmazeutika.net';
/** Documented example PIN for dev/kiosk — verification in WP-03. */
const EXTERNAL_PIN = '4711';
const hashPin = (pin: string) => createHash('sha256').update(`qm-pilot-pin:${pin}`).digest('hex');

interface SeedUser { email?: string; firstName: string; lastName: string; initials: string; roleKeys: RoleKey[]; pinHash?: string }
const SEED_USERS: SeedUser[] = [
  { email: `m.hofer@${DOMAIN}`, firstName: 'Michael', lastName: 'Hofer', initials: 'MH', roleKeys: ['gl'] },
  { email: `l.frei@${DOMAIN}`, firstName: 'Lena', lastName: 'Frei', initials: 'LF', roleKeys: ['rp', 'qmb'] },
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
  for (const key of ROLE_KEYS) { const role = await prisma.role.upsert({ where: { tenantId_key: { tenantId, key } }, create: { tenantId, key, label: ROLE_LABELS[key] }, update: { label: ROLE_LABELS[key] } }); roleMap.set(key, role.id); }
  return roleMap;
}
async function upsertUser(tenantId: string, roleMap: Map<RoleKey, string>, seed: SeedUser) {
  const roleIds = seed.roleKeys.map((k) => roleMap.get(k)!);
  const existing = seed.email
    ? await prisma.user.findUnique({ where: { tenantId_email: { tenantId, email: seed.email } }, include: { roles: true } })
    : await prisma.user.findFirst({ where: { tenantId, email: null, firstName: seed.firstName, lastName: seed.lastName }, include: { roles: true } });

  if (existing) {
    const disconnect = existing.roles.map((r) => ({ id: r.id }));
    return prisma.user.update({
      where: { id: existing.id },
      data: {
        firstName: seed.firstName,
        lastName: seed.lastName,
        initials: seed.initials,
        pinHash: seed.pinHash ?? null,
        status: 'active',
        roles: {
          disconnect,
          connect: roleIds.map((id) => ({ id })),
        },
      },
    });
  }

  return prisma.user.create({
    data: {
      tenantId,
      email: seed.email ?? null,
      firstName: seed.firstName,
      lastName: seed.lastName,
      initials: seed.initials,
      pinHash: seed.pinHash ?? null,
      status: 'active',
      roles: { connect: roleIds.map((id) => ({ id })) },
    },
  });
}
async function ensureAuditorInvite(tenantId: string, auditorUserId: string, createdById: string) {
  const existing = await prisma.auditorInvite.findFirst({ where: { userId: auditorUserId } }); if (existing) return existing;
  const now = new Date(); const validUntil = new Date(now); validUntil.setDate(validUntil.getDate() + 14);
  return prisma.auditorInvite.create({ data: { tenantId, auditorName: 'Auditor · extern', userId: auditorUserId, validFrom: now, validUntil, visibleModules: auditorDefaultVisibleModules(), createdById, status: 'active' } });
}
export async function runSeed() {
  const tenant = await ensureTenant();
  const roleMap = await ensureRoles(tenant.id);
  for (const seed of SEED_USERS) await upsertUser(tenant.id, roleMap, seed);
  const gl = await prisma.user.findUniqueOrThrow({ where: { tenantId_email: { tenantId: tenant.id, email: `m.hofer@${DOMAIN}` } } });
  const auditor = await prisma.user.findUniqueOrThrow({ where: { tenantId_email: { tenantId: tenant.id, email: 'audit@extern.example' } } });
  await ensureAuditorInvite(tenant.id, auditor.id, gl.id);
  const [tenantCount, roleCount, userCount] = await Promise.all([prisma.tenant.count(), prisma.role.count({ where: { tenantId: tenant.id } }), prisma.user.count({ where: { tenantId: tenant.id } })]);
  return { tenantCount, roleCount, userCount };
}

async function main() {
  const result = await runSeed();
  console.log(`Seed complete: ${result.tenantCount} tenant(s), ${result.roleCount} roles, ${result.userCount} users`);
}

// Only run CLI entry when executed directly
const isDirectRun = process.argv[1]?.endsWith('/seed.ts') || process.argv[1]?.endsWith('\\seed.ts');
if (isDirectRun) {
  main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
}
