import type { AuditDiff } from './types';

export const DEFAULT_REDACT_KEYS = [
  'pinHash',
  'password',
  'secret',
  'token',
  'deviceToken',
  'ssoConfig',
] as const;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Date);
}

function redactValue(key: string, value: unknown, redactKeys: readonly string[]): unknown {
  if (redactKeys.some((k) => key.toLowerCase().includes(k.toLowerCase()))) {
    return value === null || value === undefined ? value : '[redacted]';
  }
  return value;
}

function flattenRecord(
  value: Record<string, unknown> | null,
  redactKeys: readonly string[],
  prefix = '',
): Record<string, unknown> {
  if (!value) return {};
  const out: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (isPlainObject(raw)) {
      Object.assign(out, flattenRecord(raw, redactKeys, path));
    } else {
      out[path] = redactValue(path, raw, redactKeys);
    }
  }
  return out;
}

/** Build alt→neu diff for changed fields only; sensitive keys are masked. */
export function buildDiff(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
  redactKeys: readonly string[] = DEFAULT_REDACT_KEYS,
): AuditDiff | null {
  const left = flattenRecord(before, redactKeys);
  const right = flattenRecord(after, redactKeys);
  const rawLeft = flattenRecord(before, []);
  const rawRight = flattenRecord(after, []);
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  const diff: AuditDiff = {};

  for (const key of keys) {
    const rawOld = rawLeft[key] ?? null;
    const rawNew = rawRight[key] ?? null;
    if (JSON.stringify(rawOld) === JSON.stringify(rawNew)) continue;
    diff[key] = { old: left[key] ?? null, new: right[key] ?? null };
  }

  return Object.keys(diff).length > 0 ? diff : null;
}

export function summarizeDiff(diff: AuditDiff | null | undefined): string {
  if (!diff) return '';
  return Object.entries(diff)
    .map(([field, change]) => `${field}: ${String(change.old)} → ${String(change.new)}`)
    .join('; ');
}
