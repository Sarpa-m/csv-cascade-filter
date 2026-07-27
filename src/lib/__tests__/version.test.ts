import { describe, it, expect } from 'vitest';
import { compareVersions } from '../version';

describe('compareVersions', () => {
  it('returns 0 for equal versions', () => {
    expect(compareVersions('1.3.0', '1.3.0')).toBe(0);
  });

  it('returns positive when first is greater', () => {
    expect(compareVersions('2.0.0', '1.0.0')).toBeGreaterThan(0);
    expect(compareVersions('1.4.0', '1.3.0')).toBeGreaterThan(0);
    expect(compareVersions('1.3.1', '1.3.0')).toBeGreaterThan(0);
  });

  it('returns negative when first is smaller', () => {
    expect(compareVersions('1.0.0', '2.0.0')).toBeLessThan(0);
    expect(compareVersions('1.2.0', '1.3.0')).toBeLessThan(0);
  });

  it('handles v prefix by caller (strip it before comparing)', () => {
    // The function itself doesn't strip v prefix — caller should
    const a = 'v1.3.0'.replace(/^v/, '');
    const b = 'v1.2.0'.replace(/^v/, '');
    expect(compareVersions(a, b)).toBeGreaterThan(0);
  });

  it('handles different length versions', () => {
    expect(compareVersions('2', '1.9.9')).toBeGreaterThan(0);
    expect(compareVersions('1.3', '1.3.0')).toBe(0);
    expect(compareVersions('1.3.0', '1.3')).toBe(0);
  });
});
