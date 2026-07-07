import { describe, expect, it } from 'vitest';
import { greet } from './greet';

describe('greet', () => {
  it('returns a German greeting', () => {
    expect(greet('QM-Pilot')).toBe('Hallo, QM-Pilot!');
  });
});
