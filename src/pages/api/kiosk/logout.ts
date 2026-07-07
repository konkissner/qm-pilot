import type { APIRoute } from 'astro';
import { prisma } from '../../../lib/db';
import { endKioskSession } from '../../../lib/auth/kiosk-session';

export const POST: APIRoute = async ({ cookies, request }) => {
  await endKioskSession(prisma, cookies, {
    ip: request.headers.get('x-forwarded-for') ?? undefined,
    userAgent: request.headers.get('user-agent') ?? undefined,
  });
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
