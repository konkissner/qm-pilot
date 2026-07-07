import type { APIRoute } from 'astro';
import { prisma } from '../lib/db';
import { getAuthForTenant } from '../lib/auth/config';
import { endKioskSession } from '../lib/auth/kiosk-session';

export const GET: APIRoute = async ({ request, cookies, redirect }) => {
  await endKioskSession(prisma, cookies, {
    ip: request.headers.get('x-forwarded-for') ?? undefined,
    userAgent: request.headers.get('user-agent') ?? undefined,
  });
  const auth = await getAuthForTenant(prisma);
  await auth.api.signOut({ headers: request.headers });
  return redirect('/login');
};
