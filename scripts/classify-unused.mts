import { calculators } from '../src/data/calculators/index';
import findings from './auto_audit_results.json';

type Finding = {
  calcId: string;
  type: string;
  details?: { inputId?: string; label?: string };
};

const unusedIds = (findings as Finding[])
  .filter((f) => f.type === 'UNUSED_INPUT')
  .map((f) => ({
    calcId: f.calcId,
    inputId: f.details?.inputId ?? '',
    label: f.details?.label,
  }));

function baselines(c: (typeof calculators)[0]) {
  const bases: Record<string, unknown>[] = [];
  const b0: Record<string, unknown> = {};
  for (const o of c.inputs) {
    if (o.options?.length) b0[o.id] = o.options[0].value;
    else if (o.type === 'boolean') b0[o.id] = false;
    else if (o.type === 'number') b0[o.id] = o.defaultValue ?? o.min ?? 0;
  }
  bases.push(b0);

  const b1: Record<string, unknown> = {};
  for (const o of c.inputs) {
    if (o.options?.length) b1[o.id] = o.options[o.options.length - 1].value;
    else if (o.type === 'boolean') b1[o.id] = true;
    else if (o.type === 'number') b1[o.id] = o.defaultValue ?? o.max ?? 100;
  }
  bases.push(b1);

  const b2: Record<string, unknown> = {};
  for (const o of c.inputs) {
    if (o.defaultValue !== undefined) b2[o.id] = o.defaultValue;
    else if (o.options?.length) b2[o.id] = o.options[0].value;
    else if (o.type === 'boolean') b2[o.id] = false;
    else b2[o.id] = o.min ?? 0;
  }
  bases.push(b2);

  const b3: Record<string, unknown> = {};
  for (const o of c.inputs) {
    if (o.options?.length) b3[o.id] = o.options[Math.floor(o.options.length / 2)].value;
    else if (o.type === 'boolean') b3[o.id] = true;
    else if (o.type === 'number')
      b3[o.id] = o.defaultValue ?? ((o.min ?? 0) + (o.max ?? 10)) / 2;
  }
  bases.push(b3);

  // Expand around defaults: each option of each other input
  for (const o of c.inputs) {
    if (o.options?.length) {
      for (const opt of o.options) {
        bases.push({ ...b2, [o.id]: opt.value });
      }
    }
  }
  return bases;
}

function isReallyUnused(c: (typeof calculators)[0], inputId: string): boolean {
  const inp = c.inputs.find((i) => i.id === inputId);
  if (!inp?.options || inp.options.length < 2) return false;
  for (const base of baselines(c)) {
    let first: string | null = null;
    for (const opt of inp.options) {
      try {
        const res = c.calculate({ ...base, [inputId]: opt.value } as never);
        const ser = JSON.stringify(res);
        if (first === null) first = ser;
        else if (ser !== first) return false;
      } catch {
        return false;
      }
    }
  }
  return true;
}

const real: string[] = [];
const falsePos: string[] = [];
for (const u of unusedIds) {
  const c = calculators.find((x) => x.id === u.calcId);
  if (!c) {
    real.push(`${u.calcId}:${u.inputId} MISSING`);
    continue;
  }
  if (isReallyUnused(c, u.inputId)) real.push(`${u.calcId}:${u.inputId}`);
  else falsePos.push(`${u.calcId}:${u.inputId}`);
}

console.log('Audit UNUSED:', unusedIds.length);
console.log('Really unused:', real.length);
console.log(real.join('\n'));
console.log('\nFalse positives:', falsePos.length);
console.log(falsePos.join('\n'));
