import { describe, expect, it } from 'vitest';
import { getCalculator } from '../src/data/calculators';

function calc(id: string) {
  const found = getCalculator(id);
  if (!found) throw new Error(`Missing calculator ${id}`);
  return found;
}

const noFlags = {
  nh: false,
  neoplasm: false,
  liver: false,
  chf: false,
  cerebro: false,
  renal: false,
  ams: false,
  rr30: false,
  sbp90: false,
  temp35: false,
  hr125: false,
  ph735: false,
  bun30: false,
  na130: false,
  glu250: false,
  hct30: false,
  pao260: false,
  pleural: false,
};

describe('P0/P1 audit calculator fixes', () => {
  it('marks ascvd-risk as a 2013 PCE legacy tool and does not frame PCE bands as current statin rules', () => {
    const tool = calc('ascvd-risk');
    expect(tool.status).toBe('legacy');
    expect(tool.supersededBy).toBe('prevent-cvd');
    expect(tool.name).toMatch(/2013 PCE/i);
    expect(tool.whyUse).toMatch(/PREVENT/i);
    const result = tool.calculate({
      age: 55,
      sex: 'F',
      race: 'W',
      tc: 200,
      hdl: 50,
      sbp: 130,
      txHtn: false,
      dm: false,
      smoker: false,
    });
    expect(String(result.label)).toMatch(/2013 PCE/i);
    expect(result.interpretation).not.toMatch(/statin recommended for primary prevention/i);
    expect(result.interpretation).toMatch(/PREVENT/i);
  });

  it('assigns PSI Class I from the Fine step-1 screen, not a low point total', () => {
    const tool = calc('psi-port');
    const classI = tool.calculate({ age: 45, sex: 0, ...noFlags });
    expect(classI.label).toBe('PSI Class I');
    expect(classI.interpretation).toMatch(/Step 1/i);

    const classIIByAge = tool.calculate({ age: 51, sex: 0, ...noFlags });
    expect(classIIByAge.label).toBe('PSI Class II');
    expect(classIIByAge.score).toBe(51);

    const classIIByComorbidity = tool.calculate({
      age: 40,
      sex: 0,
      ...noFlags,
      neoplasm: true,
    });
    expect(classIIByComorbidity.label).toBe('PSI Class II');
    expect(classIIByComorbidity.score).toBe(70);
    expect(classIIByComorbidity.label).not.toMatch(/I–II|I-II/);
  });

  it('does not use Apgar totals to drive resuscitation instructions', () => {
    const tool = calc('apgar');
    const low = tool.calculate({
      appearance: 0,
      pulse: 0,
      grimace: 0,
      activity: 0,
      respiration: 0,
    });
    expect(low.interpretation).not.toMatch(/ongoing NRP resuscitation/i);
    expect(low.interpretation).toMatch(/NRP physiologic algorithm/i);
    expect(tool.nextSteps.flatMap((step) => step.actions).join(' ')).not.toMatch(/\bContinue NRP\b/);
    expect(tool.nextSteps.some((step) => step.condition.includes('5 min'))).toBe(true);
  });

  it('labels CKD-EPI output as a GFR category, not a CKD stage', () => {
    const tool = calc('ckd-epi');
    const result = tool.calculate({ scr: 1.0, age: 50, sex: 'M' });
    expect(result.label).toMatch(/^GFR category /);
    expect(result.label).not.toMatch(/CKD stage/i);
    expect(result.interpretation).toMatch(/does not establish CKD/i);
  });

  it('uses sex-specific QTc interpretation bands', () => {
    const tool = calc('qtc-bazett');
    const male = tool.calculate({ qt: 440, hr: 60, sex: 'M' });
    const female = tool.calculate({ qt: 440, hr: 60, sex: 'F' });
    expect(male.score).toBe(440);
    expect(male.label).toBe('Borderline');
    expect(female.label).toBe('Normal QTc');

    const maleProlonged = tool.calculate({ qt: 455, hr: 60, sex: 'M' });
    const femaleSame = tool.calculate({ qt: 455, hr: 60, sex: 'F' });
    expect(maleProlonged.label).toBe('Prolonged');
    expect(femaleSame.label).toBe('Borderline');
  });

  it('does not exclude laparoscopic cholecystectomy from original RCRI high-risk surgery', () => {
    const tool = calc('rcri');
    const help = tool.inputs.find((input) => input.id === 'highRiskSx')?.helpText ?? '';
    expect(help).not.toMatch(/Do not score laparoscopic cholecystectomy/i);
    expect(help).toMatch(/intraperitoneal/i);
  });

  it('distinguishes the 2000 Duke helper from Duke-ISCVID 2023', () => {
    const tool = calc('duke-criteria');
    expect(tool.status).toBe('legacy');
    expect(tool.supersededBy).toBe('duke-iscvid-2023');
    expect(tool.name).toMatch(/2000/);
    expect(getCalculator('duke-iscvid-2023')).toBeDefined();
  });

  it('states Naegele LMP assumptions', () => {
    const tool = calc('gestational-age');
    expect(tool.evidence.summary).toMatch(/28-day/i);
    expect(tool.evidence.summary).toMatch(/ultrasound/i);
  });
});
