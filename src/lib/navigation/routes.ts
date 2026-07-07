import type { ModuleKey } from '../permissions';

export interface RouteGuard {
  prefix: string;
  module: ModuleKey;
}

/** Shared route → module map (WP-04 navigation will consume this). */
export const ROUTE_GUARDS: RouteGuard[] = [
  { prefix: '/tasks', module: 'tasks' },
  { prefix: '/documents', module: 'documents' },
  { prefix: '/suppliers', module: 'suppliers' },
  { prefix: '/service-providers', module: 'serviceProviders' },
  { prefix: '/inventory', module: 'inventory' },
  { prefix: '/temperature', module: 'temperature' },
  { prefix: '/trainings', module: 'trainings' },
  { prefix: '/capa', module: 'capa' },
  { prefix: '/kpi', module: 'kpi' },
  { prefix: '/reports', module: 'reports' },
  { prefix: '/users', module: 'users' },
  { prefix: '/system', module: 'system' },
  { prefix: '/audit', module: 'reports' },
];

export const PUBLIC_PATHS = [
  '/login',
  '/api/auth',
  '/api/health',
  '/api/kiosk/device-check',
];

export const KIOSK_PUBLIC_PATHS = ['/kiosk', '/api/kiosk'];

export function isPublicPath(pathname: string): boolean {
  if (pathname === '/') return false;
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function isKioskPath(pathname: string): boolean {
  return KIOSK_PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function moduleForPath(pathname: string): ModuleKey | null {
  const guard = ROUTE_GUARDS.find((g) => pathname === g.prefix || pathname.startsWith(`${g.prefix}/`));
  return guard?.module ?? null;
}

export function isMutationMethod(method: string): boolean {
  return !['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase());
}
