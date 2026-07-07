import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { twoFactor } from 'better-auth/plugins/two-factor';
import { genericOAuth, microsoftEntraId } from 'better-auth/plugins/generic-oauth';
import type { PrismaClient } from '@prisma/client';
import { parseSsoConfig } from './sso';
import { writeAuthAuditEvent } from './audit';
import type { AuditEventContext } from '../audit/types';
import { checkPasswordLock, recordPasswordFailure, resetPasswordFailures } from './password-lock';

export function getAuthSecret(): string {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error('BETTER_AUTH_SECRET is required');
  return secret;
}

export function getAuthBaseUrl(): string {
  return process.env.BETTER_AUTH_URL ?? 'http://localhost:4321';
}

export function getDefaultTenantSlug(): string {
  return process.env.DEFAULT_TENANT_SLUG ?? 'pharmazeutika-73-3';
}

function buildOidcProviders(ssoConfig: ReturnType<typeof parseSsoConfig>) {
  if (!ssoConfig) return [];
  return [
    microsoftEntraId({
      clientId: ssoConfig.clientId,
      clientSecret: ssoConfig.clientSecret,
      tenantId: ssoConfig.tenantId || 'common',
    }),
  ];
}

export function createAuth(
  prisma: PrismaClient,
  options: { ssoConfig?: ReturnType<typeof parseSsoConfig>; sessionTimeoutMinutes?: number } = {},
) {
  const sessionTimeoutMinutes = options.sessionTimeoutMinutes ?? 30;

  return betterAuth({
    secret: getAuthSecret(),
    baseURL: getAuthBaseUrl(),
    trustedOrigins: [getAuthBaseUrl()],
    database: prismaAdapter(prisma, { provider: 'postgresql' }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 12,
      autoSignIn: false,
    },
    session: {
      modelName: 'authSession',
      expiresIn: sessionTimeoutMinutes * 60,
      updateAge: 60,
    },
    user: {
      modelName: 'user',
      fields: {
        name: 'name',
        email: 'email',
        emailVerified: 'emailVerified',
        image: 'avatarUrl',
      },
      additionalFields: {
        tenantId: { type: 'string', required: true },
        firstName: { type: 'string', required: true },
        lastName: { type: 'string', required: true },
        mustChangePassword: { type: 'boolean', required: false },
        twoFactorEnabled: { type: 'boolean', required: false },
      },
    },
    account: {
      modelName: 'authAccount',
      fields: {
        accountId: 'accountId',
        providerId: 'providerId',
        userId: 'userId',
        accessToken: 'accessToken',
        refreshToken: 'refreshToken',
        idToken: 'idToken',
        accessTokenExpiresAt: 'accessTokenExpiresAt',
        refreshTokenExpiresAt: 'refreshTokenExpiresAt',
        scope: 'scope',
        password: 'password',
      },
    },
    verification: {
      modelName: 'authVerification',
    },
    plugins: [
      twoFactor({
        issuer: 'QM-Pilot',
        twoFactorTable: 'twoFactor',
      }),
      ...(options.ssoConfig
        ? [
            genericOAuth({
              config: buildOidcProviders(options.ssoConfig),
            }),
          ]
        : []),
    ],
    advanced: {
      cookiePrefix: 'qm_pilot',
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;

export async function getAuthForTenant(prisma: PrismaClient): Promise<Auth> {
  const tenant = await prisma.tenant.findUnique({
    where: { slug: getDefaultTenantSlug() },
    include: { config: true },
  });
  const ssoConfig = tenant?.config?.ssoEnabled ? parseSsoConfig(tenant.config.ssoConfig) : null;
  return createAuth(prisma, {
    ssoConfig,
    sessionTimeoutMinutes: tenant?.config?.sessionTimeoutMinutes,
  });
}

export async function auditLoginFailure(
  prisma: PrismaClient,
  tenantId: string,
  userId: string,
  method: string,
  failedAttempts: number,
  context?: AuditEventContext,
): Promise<void> {
  await writeAuthAuditEvent(
    prisma,
    tenantId,
    userId,
    {
      action: 'auth.loginFailed',
      actionLabel: 'Anmeldung fehlgeschlagen',
      diff: { method: { old: null, new: method }, failedAttempts: { old: null, new: failedAttempts } },
      severity: 'warning',
    },
    context,
  );
}

export async function auditLoginSuccess(
  prisma: PrismaClient,
  tenantId: string,
  userId: string,
  method: string,
  context?: AuditEventContext,
): Promise<void> {
  await writeAuthAuditEvent(
    prisma,
    tenantId,
    userId,
    {
      action: 'auth.login',
      actionLabel: 'Anmeldung erfolgreich',
      diff: { method: { old: null, new: method } },
    },
    context,
  );
  await resetPasswordFailures(prisma, userId);
}

export async function guardPasswordLogin(
  prisma: PrismaClient,
  userId: string,
): Promise<{ allowed: boolean; throttleMs: number }> {
  const lock = await checkPasswordLock(prisma, userId);
  return { allowed: lock.allowed, throttleMs: lock.throttleMs };
}

export async function handlePasswordLoginFailure(prisma: PrismaClient, userId: string) {
  return recordPasswordFailure(prisma, userId);
}
