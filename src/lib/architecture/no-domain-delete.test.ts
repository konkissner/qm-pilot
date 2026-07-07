import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const SRC_ROOT = join(process.cwd(), 'src');

/** Technical tables that may use prisma.*.delete in application code (sessions, scheduler housekeeping). */
const DELETE_WHITELIST = new Set(['schedulerRun']);

const DELETE_PATTERN = /prisma\.(\w+)\.delete\s*\(/g;

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    if (entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) return [full];
    return [];
  });
}

describe('architecture: no physical delete on domain models (R-013)', () => {
  it('does not call prisma.<model>.delete outside whitelist in src/', () => {
    const violations: string[] = [];
    for (const file of walk(SRC_ROOT)) {
      const content = readFileSync(file, 'utf-8');
      for (const match of content.matchAll(DELETE_PATTERN)) {
        const model = match[1];
        if (!model) continue;
        const normalized = model.charAt(0).toLowerCase() + model.slice(1);
        if (!DELETE_WHITELIST.has(normalized)) {
          violations.push(`${relative(process.cwd(), file)}: prisma.${model}.delete(`);
        }
      }
    }
    expect(violations).toEqual([]);
  });
});
