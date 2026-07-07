import type { APIRoute } from 'astro';
import { prisma } from '../../../lib/db';
import { resolveKioskDevice } from '../../../lib/auth/session-resolver';
import { attemptKioskPinLogin, kioskSessionCookieOptions } from '../../../lib/auth/kiosk-session';

export const POST: APIRoute = async ({ request, cookies }) => {
  const device = await resolveKioskDevice(prisma, cookies);
  if (!device) {
    return new Response(JSON.stringify({ error: 'Gerät nicht registriert.' }), { status: 403 });
  }

  const body = (await request.json()) as { userId?: string; pin?: string };
  if (!body.userId || !body.pin) {
    return new Response(JSON.stringify({ error: 'Benutzer und PIN erforderlich.' }), { status: 400 });
  }

  const tenantConfig = await prisma.tenantConfig.findUniqueOrThrow({ where: { tenantId: device.tenantId } });
  const result = await attemptKioskPinLogin(prisma, {
    userId: body.userId,
    tenantId: device.tenantId,
    kioskDeviceId: device.id,
    pin: body.pin,
    autoLockSeconds: tenantConfig.kioskAutoLockSeconds,
    context: {
      ip: request.headers.get('x-forwarded-for') ?? undefined,
      userAgent: request.headers.get('user-agent') ?? undefined,
      kioskDeviceId: device.id,
    },
  });

  if (!result.ok) {
    if (result.throttleMs > 0) {
      await new Promise((r) => setTimeout(r, result.throttleMs));
    }
    return new Response(
      JSON.stringify({
        error: result.locked ? 'PIN gesperrt.' : 'PIN falsch.',
        locked: result.locked,
        pinLockedUntil: result.pinLockedUntil?.toISOString() ?? null,
        failedAttempts: result.failedAttempts,
      }),
      { status: 401 },
    );
  }

  const secure = request.url.startsWith('https');
  cookies.set(
    kioskSessionCookieOptions(result.token, secure, tenantConfig.kioskAutoLockSeconds).name,
    result.token,
    kioskSessionCookieOptions(result.token, secure, tenantConfig.kioskAutoLockSeconds),
  );

  await prisma.kioskDevice.update({ where: { id: device.id }, data: { lastSeenAt: new Date() } });

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};

export const GET: APIRoute = async ({ cookies }) => {
  const user = await prisma.user.findFirst({
    where: { pinHash: { not: null } },
    select: { pinLockedUntil: true },
  });
  void user;
  const device = await resolveKioskDevice(prisma, cookies);
  if (!device) return new Response(JSON.stringify({ locked: false }), { status: 200 });
  return new Response(JSON.stringify({ locked: false }), { status: 200 });
};
