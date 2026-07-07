import { describe, expect, it } from 'vitest';
import { buildDiff, summarizeDiff } from './diff';

describe('buildDiff', () => {
  it('returns only changed fields', () => {
    const diff = buildDiff({ a: 1, b: 2 }, { a: 1, b: 3 });
    expect(diff).toEqual({ b: { old: 2, new: 3 } });
  });

  it('handles create with null before', () => {
    const diff = buildDiff(null, { firstName: 'Max' });
    expect(diff).toEqual({ firstName: { old: null, new: 'Max' } });
  });

  it('redacts sensitive fields', () => {
    const diff = buildDiff({ pinHash: 'secret' }, { pinHash: 'other' });
    expect(diff).toEqual({ pinHash: { old: '[redacted]', new: '[redacted]' } });
  });

  it('returns null when nothing changed', () => {
    expect(buildDiff({ a: 1 }, { a: 1 })).toBeNull();
  });

  it('flattens nested objects', () => {
    const diff = buildDiff({ profile: { city: 'BW' } }, { profile: { city: 'BY' } });
    expect(diff).toEqual({ 'profile.city': { old: 'BW', new: 'BY' } });
  });
});

describe('summarizeDiff', () => {
  it('formats field changes', () => {
    const text = summarizeDiff({ status: { old: 'active', new: 'retired' } });
    expect(text).toContain('status: active → retired');
  });
});
