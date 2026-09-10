/**
 * Shared CI failure policy for the automated audit suites.
 *
 * Audit finding #2: `tests/audit-master-suite.test.ts` and
 * `tests/audit-scoring-auto.test.ts` computed a findings array, wrote it to JSON
 * and then passed unconditionally, so a scoring regression could never fail CI.
 *
 * THE POLICY
 * ----------
 * 1. Any finding whose severity is CRITICAL or HIGH fails the suite. These can
 *    never be allowlisted.
 * 2. Any remaining finding (MEDIUM, LOW, or any other severity) also fails the
 *    suite unless its key `${calcId}::${issueType}` appears in AUDIT_ALLOWLIST
 *    together with a written reason.
 * 3. AUDIT_ALLOWLIST is currently empty. The baseline for both suites is 0
 *    findings, so the empty allowlist is the correct steady state. Entries may
 *    only ever be added with an explicit reason, and the list should shrink over
 *    time, never grow silently.
 * 4. On failure the assertion message lists at most MAX_REPORTED_FINDINGS
 *    offending findings, one compact line each (calcId | issueType | severity |
 *    message), plus a count of any findings omitted. The full findings array
 *    stays in the JSON report; CI output must stay readable rather than dumping
 *    megabytes of serialized objects.
 */
import { expect } from 'vitest';

export type FindingSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | (string & {});

/** Severities that always fail and can never be allowlisted. */
export const NEVER_ALLOWLISTABLE: readonly string[] = ['CRITICAL', 'HIGH'];

/** Maximum number of findings printed in an assertion message. */
export const MAX_REPORTED_FINDINGS = 25;

/** Maximum characters of a single finding message reproduced in CI output. */
const MAX_MESSAGE_CHARS = 160;

export interface AllowlistEntry {
  /** `${calcId}::${issueType}` */
  key: string;
  /** Why this finding is tolerated, and what would let it be removed. */
  reason: string;
}

/**
 * Explicit allowlist of tolerated non-CRITICAL/non-HIGH findings.
 *
 * INTENTIONALLY EMPTY. Both audit suites report 0 findings today. Adding an
 * entry here is a deliberate, reviewable act: it must name the exact
 * `calcId::issueType` and say why the finding is acceptable.
 */
export const AUDIT_ALLOWLIST: readonly AllowlistEntry[] = [
  // (empty — baseline is 0 findings in both audit suites)
];

/** Shape the two audit suites are normalized into before the policy runs. */
export interface NormalizedFinding {
  calcId: string;
  issueType: string;
  severity: FindingSeverity;
  message: string;
}

export function findingKey(finding: NormalizedFinding): string {
  return `${finding.calcId}::${finding.issueType}`;
}

function truncate(text: string): string {
  const flat = String(text ?? '').replace(/\s+/g, ' ').trim();
  return flat.length > MAX_MESSAGE_CHARS ? `${flat.slice(0, MAX_MESSAGE_CHARS - 1)}…` : flat;
}

/** One compact line per finding, capped so CI output stays actionable. */
export function formatFindings(findings: readonly NormalizedFinding[], limit = MAX_REPORTED_FINDINGS): string {
  const shown = findings.slice(0, limit).map((f) => `  ${f.calcId} | ${f.issueType} | ${f.severity} | ${truncate(f.message)}`);
  const omitted = findings.length - shown.length;
  if (omitted > 0) shown.push(`  …and ${omitted} more finding(s) — see the JSON report for the full list.`);
  return shown.join('\n');
}

/**
 * Applies the documented policy. Throws (via `expect`) with a compact,
 * actionable message when the suite must fail.
 */
export function assertAuditPolicy(suiteName: string, findings: readonly NormalizedFinding[], reportPath: string): void {
  const allowed = new Set(AUDIT_ALLOWLIST.map((entry) => entry.key));

  const blocking = findings.filter((f) => NEVER_ALLOWLISTABLE.includes(String(f.severity).toUpperCase()));
  const otherUnallowed = findings.filter(
    (f) => !NEVER_ALLOWLISTABLE.includes(String(f.severity).toUpperCase()) && !allowed.has(findingKey(f)),
  );

  if (blocking.length > 0) {
    expect.fail(
      `${suiteName}: ${blocking.length} CRITICAL/HIGH finding(s). These can never be allowlisted.\n` +
        `${formatFindings(blocking)}\n` +
        `Full report: ${reportPath}`,
    );
  }

  if (otherUnallowed.length > 0) {
    expect.fail(
      `${suiteName}: ${otherUnallowed.length} finding(s) not present in AUDIT_ALLOWLIST (tests/audit-failure-policy.ts).\n` +
        `${formatFindings(otherUnallowed)}\n` +
        `Fix the calculator, or add an allowlist entry with a written reason.\n` +
        `Full report: ${reportPath}`,
    );
  }
}
