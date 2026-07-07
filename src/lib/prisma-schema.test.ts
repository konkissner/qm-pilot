import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

describe('zenstack generate', () => {
  it('produces WP-01 core models', () => {
    const schemaPath = resolve(process.cwd(), 'prisma/schema.prisma');
    expect(existsSync(schemaPath)).toBe(true);
    const schema = readFileSync(schemaPath, 'utf-8');
    for (const model of ['Tenant', 'TenantConfig', 'User', 'Role', 'RoleRight', 'UserRight', 'Holiday', 'KioskDevice', 'AuditorInvite']) {
      expect(schema).toContain(`model ${model}`);
    }
    expect(schema).not.toContain('model SystemInfo');
  });
  it('allows importing PrismaClient', async () => {
    const { PrismaClient } = await import('@prisma/client');
    expect(PrismaClient).toBeDefined();
  });
});
