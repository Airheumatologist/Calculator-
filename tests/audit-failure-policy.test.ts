import { describe, expect, it } from 'vitest';
import { AUDIT_ALLOWLIST, assertAuditPolicy, formatFindings, type NormalizedFinding } from './audit-failure-policy';

/**
 * Proves the CI gate added for audit finding #2 actually fails. Without this,
 * "the audit suites now assert" is only true until someone breaks the helper.
 */

const finding = (over: Partial<NormalizedFinding> = {}): NormalizedFinding => ({
  calcId: 'demo-calc',
  issueType: 'NAN_SCORE',
  severity: 'CRITICAL',
  message: 'calculate() produced NaN',
  ...over,
});

describe('audit failure policy', () => {
  it('passes when there are no findings', () => {
    expect(() => assertAuditPolicy('demo', [], 'report.json')).not.toThrow();
  });

  it('fails on a CRITICAL finding', () => {
    expect(() => assertAuditPolicy('demo', [finding()], 'report.json')).toThrow(/CRITICAL\/HIGH finding/);
  });

  it('fails on a HIGH finding', () => {
    expect(() => assertAuditPolicy('demo', [finding({ severity: 'HIGH' })], 'report.json')).toThrow(/CRITICAL\/HIGH finding/);
  });

  it('fails on a MEDIUM finding that is not allowlisted', () => {
    expect(() => assertAuditPolicy('demo', [finding({ severity: 'MEDIUM' })], 'report.json')).toThrow(/not present in AUDIT_ALLOWLIST/);
  });

  it('starts from an empty allowlist', () => {
    // The baseline is 0 findings in every audit suite, so anything in here is
    // technical debt that must come with a written reason.
    expect(AUDIT_ALLOWLIST).toEqual([]);
  });

  it('prints findings compactly and caps the list', () => {
    const many = Array.from({ length: 40 }, (_, i) => finding({ calcId: `calc-${i}` }));
    const text = formatFindings(many);
    expect(text.split('\n')).toHaveLength(26); // 25 findings + the "…and N more" line
    expect(text).toContain('…and 15 more finding(s)');
    expect(text).toContain('calc-0 | NAN_SCORE | CRITICAL | calculate() produced NaN');
  });

  it('truncates a very long finding message instead of dumping it', () => {
    const text = formatFindings([finding({ message: 'x'.repeat(5000) })]);
    expect(text.length).toBeLessThan(300);
    expect(text).toContain('…');
  });
});
