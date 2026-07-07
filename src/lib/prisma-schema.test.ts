import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

describe('zenstack generate', () => {
  it('produces a valid Prisma schema with SystemInfo model', () => {
    const schemaPath = resolve(process.cwd(), 'prisma/schema.prisma');
    expect(existsSync(schemaPath)).toBe(true);

    const schema = readFileSync(schemaPath, 'utf-8');
    expect(schema).toContain('model SystemInfo');
    expect(schema).toContain('provider = "postgresql"');
  });

  it('allows importing PrismaClient', async () => {
    const { PrismaClient } = await import('@prisma/client');
    expect(PrismaClient).toBeDefined();
  });
});
