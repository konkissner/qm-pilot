import type { APIRoute } from 'astro';
import { checkHealth } from '@/lib/health';

export const GET: APIRoute = async () => {
  const health = await checkHealth();
  const httpStatus = health.status === 'down' ? 503 : health.status === 'degraded' ? 200 : 200;

  return new Response(JSON.stringify(health), {
    status: httpStatus,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
};
