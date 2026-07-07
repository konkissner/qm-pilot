import type { APIRoute } from 'astro';
import { prisma } from '../../../lib/db';
import { resolveKioskDevice } from '../../../lib/auth/session-resolver';

export const GET: APIRoute = async ({ cookies }) => {
  const device = await resolveKioskDevice(prisma, cookies);
  if (!device) {
    return new Response(JSON.stringify({ registered: false }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return new Response(JSON.stringify({ registered: true, deviceId: device.id, name: device.name }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
