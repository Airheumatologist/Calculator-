import { describe, expect, it } from 'vitest';
import { getCalculator } from '../src/data/calculators';
import { getInitialFormValues, getMissingRequiredInputs } from '../src/utils/helpers';

const sleDas = getCalculator('sle-das');
if (!sleDas) throw new Error('Missing calculator sle-das');

const inactiveValues = {
  arthritis: false,
  sjc: 0,
  mucocutVasc: false,
  localRash: false,
  generalRash: false,
  alopecia: false,
  ulcers: false,
  hypoC: false,
  dsdna: false,
  pprot: false,
  prot: 0,
  thromb: false,
  platCount: 250,
  leuk: false,
  leukCount: 6,
  neuropsych: false,
  systemicVasc: false,
  cardioPulm: false,
  myositis: false,
  serositis: false,
  hemolytic: false,
};

type GateCase = {
  label: string;
  flag: 'pprot' | 'thromb' | 'leuk';
  numeric: 'prot' | 'platCount' | 'leukCount';
  flagValue: boolean;
  numericValue: number;
  valid: boolean;
};

const gateCases: GateCase[] = [
  // PProt is implemented at the existing calculator boundary: ≥500 mg/24 h.
  { label: 'PProt No below threshold', flag: 'pprot', numeric: 'prot', flagValue: false, numericValue: 499, valid: true },
  { label: 'PProt No at threshold', flag: 'pprot', numeric: 'prot', flagValue: false, numericValue: 500, valid: false },
  { label: 'PProt No above threshold', flag: 'pprot', numeric: 'prot', flagValue: false, numericValue: 501, valid: false },
  { label: 'PProt Yes below threshold', flag: 'pprot', numeric: 'prot', flagValue: true, numericValue: 499, valid: false },
  { label: 'PProt Yes at threshold', flag: 'pprot', numeric: 'prot', flagValue: true, numericValue: 500, valid: true },
  { label: 'PProt Yes above threshold', flag: 'pprot', numeric: 'prot', flagValue: true, numericValue: 501, valid: true },
  { label: 'Thrombocytopenia No below threshold', flag: 'thromb', numeric: 'platCount', flagValue: false, numericValue: 99, valid: false },
  { label: 'Thrombocytopenia No at threshold', flag: 'thromb', numeric: 'platCount', flagValue: false, numericValue: 100, valid: true },
  { label: 'Thrombocytopenia No above threshold', flag: 'thromb', numeric: 'platCount', flagValue: false, numericValue: 101, valid: true },
  { label: 'Thrombocytopenia Yes below threshold', flag: 'thromb', numeric: 'platCount', flagValue: true, numericValue: 99, valid: true },
  { label: 'Thrombocytopenia Yes at threshold', flag: 'thromb', numeric: 'platCount', flagValue: true, numericValue: 100, valid: false },
  { label: 'Thrombocytopenia Yes above threshold', flag: 'thromb', numeric: 'platCount', flagValue: true, numericValue: 101, valid: false },
  { label: 'Leukopenia No below threshold', flag: 'leuk', numeric: 'leukCount', flagValue: false, numericValue: 2.9, valid: false },
  { label: 'Leukopenia No at threshold', flag: 'leuk', numeric: 'leukCount', flagValue: false, numericValue: 3, valid: true },
  { label: 'Leukopenia No above threshold', flag: 'leuk', numeric: 'leukCount', flagValue: false, numericValue: 3.1, valid: true },
  { label: 'Leukopenia Yes below threshold', flag: 'leuk', numeric: 'leukCount', flagValue: true, numericValue: 2.9, valid: true },
  { label: 'Leukopenia Yes at threshold', flag: 'leuk', numeric: 'leukCount', flagValue: true, numericValue: 3, valid: false },
  { label: 'Leukopenia Yes above threshold', flag: 'leuk', numeric: 'leukCount', flagValue: true, numericValue: 3.1, valid: false },
];

describe('SLE-DAS bidirectional laboratory gates', () => {
  it.each(gateCases)('$label', ({ flag, numeric, flagValue, numericValue, valid }) => {
    const result = sleDas.calculate({ ...inactiveValues, [flag]: flagValue, [numeric]: numericValue });

    expect(result.score === '—').toBe(!valid);
    if (valid) {
      expect(typeof result.score).toBe('number');
    } else {
      expect(result).toMatchObject({ score: '—', label: 'Invalid inputs', riskLevel: 'info' });
      expect(result.interpretation).toMatch(/flag|proteinuria|platelets|leukocytes|WBC/i);
    }
  });

  it('keeps the validated formula for consistent profiles', () => {
    expect(sleDas.calculate(inactiveValues).score).toBe(0.37);
    expect(sleDas.calculate({ ...inactiveValues, pprot: true, prot: 501 }).score).toBe(6.47);
    expect(sleDas.calculate({ ...inactiveValues, thromb: true, platCount: 50 }).score).toBe(4.65);
    expect(sleDas.calculate({ ...inactiveValues, leuk: true, leukCount: 2 }).score).toBe(2.98);
  });

  it('keeps the definitions visible in input copy, details, and evidence', () => {
    expect(sleDas.inputs.find(({ id }) => id === 'pprot')?.label).toMatch(/≥?500/);
    expect(sleDas.inputs.find(({ id }) => id === 'thromb')?.label).toMatch(/<100/);
    expect(sleDas.inputs.find(({ id }) => id === 'leuk')?.label).toMatch(/<3/);
    expect(sleDas.evidence.formula).toMatch(/Prot ≥500/);
    expect(sleDas.evidence.formula).toMatch(/platelets <100/);
    expect(sleDas.evidence.formula).toMatch(/WBC <3/);
    expect(sleDas.evidence.references).toEqual(
      expect.arrayContaining([expect.objectContaining({ pmid: '30626657', doi: '10.1136/annrheumdis-2018-214502' })]),
    );

    const reverse = sleDas.calculate({ ...inactiveValues, pprot: false, prot: 500 });
    expect(reverse.details).toEqual(
      expect.arrayContaining([
        { label: 'PProt >500 mg/24 h', value: '0' },
        { label: 'Proteinuria mg/24 h', value: '500' },
      ]),
    );
    expect(reverse.interpretation).toMatch(/PProt is No|≥500|<500/);
  });

  it('leaves a fresh form incomplete until every laboratory gate input is answered', () => {
    const fresh = getInitialFormValues(sleDas);
    const missing = getMissingRequiredInputs(sleDas.inputs, fresh);

    expect(missing.map(({ id }) => id)).toEqual(
      expect.arrayContaining(['pprot', 'prot', 'thromb', 'platCount', 'leuk', 'leukCount']),
    );
    expect(missing.length).toBe(sleDas.inputs.length);
  });
});

