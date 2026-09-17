import { describe, expect, it } from 'vitest';
import { bool, num } from '../src/utils/helpers';

describe('engine boolean coercion', () => {
  it('accepts true-like strings regardless of case or surrounding whitespace', () => {
    for (const value of ['true', 'TRUE', 'True', ' true ', 'yes', 'Yes', 'YES', 'y', 'Y', '1', 'on', 'ON']) {
      expect(bool(value), `expected bool(${JSON.stringify(value)}) to be true`).toBe(true);
    }
  });

  it('rejects false-like, blank, and unrecognized strings', () => {
    for (const value of ['false', 'FALSE', 'no', 'No', '0', 'off', '', '   ', 'maybe', 'n/a', '2']) {
      expect(bool(value), `expected bool(${JSON.stringify(value)}) to be false`).toBe(false);
    }
  });

  it('keeps boolean and numeric coercion semantics', () => {
    expect(bool(true)).toBe(true);
    expect(bool(false)).toBe(false);
    expect(bool(1)).toBe(true);
    expect(bool(0)).toBe(false);
    expect(bool(-1)).toBe(true);
    expect(bool(Number.NaN)).toBe(false);
    expect(bool(null)).toBe(false);
    expect(bool(undefined)).toBe(false);
  });

  it('leaves numeric parsing untouched for uppercase strings', () => {
    expect(num(' 12 ')).toBe(12);
    expect(num('TRUE')).toBe(0);
  });
});
