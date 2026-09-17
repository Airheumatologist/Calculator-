import { describe, expect, it } from 'vitest';
import { calculators } from '../src/data/calculators';

/**
 * Regression pin for three references whose identifiers pointed at unrelated
 * papers (found by resolving every PMID/DOI in the registry against PubMed and
 * Crossref — see `scripts/check-citations.mjs --network`).
 *
 * `The QT Interval` carried the PMID of a liposarcoma review *and* the DOI of a
 * transgender-hormone-therapy paper; the Ma 2010 performance-status DOI
 * resolved to a colorectal-cancer quality-of-life review; and the KDIGO CKD
 * reference pointed at the supplement's front-matter "Notice" page.
 */
const CORRECTED = [
  {
    calculator: 'qtc-bazett',
    title: 'The QT Interval',
    pmid: '31180747',
    doi: '10.1161/CIRCULATIONAHA.119.039598',
  },
  {
    calculator: 'karnofsky',
    title: 'Interconversion of three measures of performance status: an empirical analysis',
    pmid: '20674334',
    doi: '10.1016/j.ejca.2010.06.126',
  },
  {
    calculator: 'bicarb-ckd',
    title: 'KDIGO 2012 Clinical Practice Guideline for the Evaluation and Management of Chronic Kidney Disease',
    pmid: '25018998',
    doi: '10.1038/kisup.2013.31',
  },
] as const;

describe('citation identifier integrity', () => {
  for (const expected of CORRECTED) {
    it(`${expected.calculator} cites ${expected.pmid} / ${expected.doi}`, () => {
      const calc = calculators.find((c) => c.id === expected.calculator);
      expect(calc, `calculator ${expected.calculator} is registered`).toBeDefined();
      const ref = calc?.evidence.references.find((r) => r.title === expected.title);
      expect(ref, `${expected.calculator} carries "${expected.title}"`).toBeDefined();
      expect(ref?.pmid).toBe(expected.pmid);
      expect(ref?.doi).toBe(expected.doi);
    });
  }

  it('never declares the same DOI for two clearly different papers in one calculator', () => {
    const problems: string[] = [];
    for (const calc of calculators) {
      const seen = new Map<string, string>();
      for (const ref of calc.evidence.references) {
        if (!ref.doi) continue;
        const key = ref.doi.toLowerCase();
        const previous = seen.get(key);
        if (previous && previous !== ref.title) {
          problems.push(`${calc.id}: DOI ${ref.doi} used for "${previous}" and "${ref.title}"`);
        }
        seen.set(key, ref.title);
      }
    }
    expect(problems).toEqual([]);
  });
});
