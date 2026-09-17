import { describe, expect, it } from 'vitest';
import { calculators } from '../src/data/calculators';
import type { UnitKind } from '../src/types/calculator';

/**
 * The shared unit-selector convention is opt-in per field (`unitKind`), so a
 * missing declaration is invisible: the field silently keeps a single unit and
 * the user is back to converting by hand. This sweep makes the families the
 * audit calls out fail loudly when a new field is added without a selector.
 *
 * Matching is by the field's own declared unit plus its id/label, so
 * unit-agnostic tools (creatinine *clearance* in mL/min, the mg/dL <-> µmol/L
 * converter, ratio/z-score fields) are not swept in.
 */
const EXPECTED: { kind: UnitKind; unit: RegExp; name: RegExp; skip?: RegExp }[] = [
  { kind: 'weight', unit: /^kg$/, name: /weight/i },
  { kind: 'creatinine', unit: /^mg\/dL$/, name: /creatinine/i, skip: /clearance|ratio/i },
  {
    kind: 'fio2',
    unit: /^(fraction.*|%|percent)$/,
    name: /fio.?2|inspired oxygen/i,
    skip: /pao.?2\s*\/\s*fio.?2|ratio/i,
  },
  { kind: 'ddimer', unit: /(FEU|DDU|ng\/mL|µg\/mL)/i, name: /d-?dimer/i },
];

describe('unit-family field coverage', () => {
  it('declares the matching unitKind on every weight, creatinine, FiO₂ and D-dimer field', () => {
    const problems: string[] = [];
    for (const calc of calculators) {
      for (const input of calc.inputs) {
        const unit = input.unit ?? '';
        const name = `${input.id} ${input.label}`;
        for (const family of EXPECTED) {
          if (!family.unit.test(unit) || !family.name.test(name)) continue;
          if (family.skip?.test(name)) continue;
          if (input.unitKind !== family.kind) {
            problems.push(
              `${calc.id}:${input.id} "${input.label}" (unit ${unit}) should declare unitKind '${family.kind}' (has ${input.unitKind ?? 'none'})`
            );
          }
        }
      }
    }
    expect(problems).toEqual([]);
  });

  it('keeps the four audit families represented across the registry', () => {
    const counts: Record<string, number> = {};
    for (const calc of calculators) {
      for (const input of calc.inputs) {
        if (input.unitKind) counts[input.unitKind] = (counts[input.unitKind] ?? 0) + 1;
      }
    }
    // Guard rails: a large accidental deletion of unitKind declarations fails here.
    expect(counts.weight).toBeGreaterThanOrEqual(70);
    expect(counts.creatinine).toBeGreaterThanOrEqual(40);
    expect(counts.fio2).toBeGreaterThanOrEqual(10);
    expect(counts.ddimer).toBeGreaterThanOrEqual(3);
  });
});
