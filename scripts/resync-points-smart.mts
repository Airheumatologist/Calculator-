/**
 * Re-measure option point deltas with smarter baselines so early-exit paths
 * don't zero out legitimate weighted yesNo points.
 *
 * For each option with declared points:
 * - Try multiple base value combinations
 * - Take the actualDelta from the baseline that produces the largest |delta|
 *   (preferring deltas that match declared when possible)
 * - Update yesNo third-arg / option points when they disagree with best measured delta
 */
import * as fs from 'fs';
import * as path from 'path';
import { calculators } from '../src/data/calculators/index';
import type { Calculator, CalcInput } from '../src/types/calculator';

function defaultVals(c: Calculator): Record<string, unknown> {
  const v: Record<string, unknown> = {};
  for (const inp of c.inputs) {
    if (inp.defaultValue !== undefined) v[inp.id] = inp.defaultValue;
    else if (inp.options?.length) v[inp.id] = inp.options[0].value;
    else if (inp.type === 'boolean') v[inp.id] = false;
    else if (inp.type === 'number') v[inp.id] = inp.min ?? 0;
  }
  return v;
}

function baseVariants(c: Calculator, focusId: string): Record<string, unknown>[] {
  const bases: Record<string, unknown>[] = [];
  const d = defaultVals(c);

  // all options at first / last / mid
  const mk = (pick: (inp: CalcInput) => unknown) => {
    const b: Record<string, unknown> = {};
    for (const inp of c.inputs) {
      if (inp.id === focusId) continue;
      b[inp.id] = pick(inp);
    }
    return b;
  };

  bases.push(
    mk((inp) =>
      inp.options?.length
        ? inp.options[0].value
        : inp.type === 'boolean'
          ? false
          : (inp.defaultValue ?? inp.min ?? 0)
    )
  );
  bases.push(
    mk((inp) =>
      inp.options?.length
        ? inp.options[inp.options.length - 1].value
        : inp.type === 'boolean'
          ? true
          : (inp.defaultValue ?? inp.max ?? 100)
    )
  );
  bases.push(
    mk((inp) =>
      inp.options?.length
        ? inp.options[Math.floor(inp.options.length / 2)].value
        : inp.type === 'boolean'
          ? true
          : (inp.defaultValue ?? inp.min ?? 0)
    )
  );
  bases.push({ ...d });
  // zero-points preference when available
  bases.push(
    mk((inp) => {
      if (inp.options?.length) {
        const z = inp.options.find((o) => o.points === 0);
        return z ? z.value : inp.options[0].value;
      }
      if (inp.type === 'boolean') return false;
      return inp.defaultValue ?? inp.min ?? 0;
    })
  );

  // toggle each boolean to true with defaults
  for (const inp of c.inputs) {
    if (inp.id === focusId) continue;
    if (inp.type === 'boolean' || (inp.options?.length === 2 && inp.options[0].value === false)) {
      bases.push({ ...d, [inp.id]: true });
    }
  }

  // For number inputs use defaultValue if present
  for (const inp of c.inputs) {
    if (inp.id === focusId) continue;
    if (inp.type === 'number' && inp.defaultValue !== undefined) {
      bases.push({ ...d, [inp.id]: inp.defaultValue });
    }
  }

  return bases;
}

type Fix = { calcId: string; inputId: string; optionLabel: string; declared: number; measured: number };

const fixes: Fix[] = [];

for (const c of calculators) {
  for (const inp of c.inputs) {
    if (!inp.options?.length) continue;
    const withPts = inp.options.filter((o) => typeof o.points === 'number');
    if (!withPts.length) continue;

    const zeroOpt = inp.options.find((o) => o.points === 0) ?? inp.options.find((o) => o.value === false || o.value === 0);
    if (!zeroOpt) continue;

    for (const opt of withPts) {
      if (opt.value === zeroOpt.value) continue;
      let bestDelta = 0;
      let foundNumeric = false;

      for (const base of baseVariants(c, inp.id)) {
        try {
          const z = c.calculate({ ...base, [inp.id]: zeroOpt.value } as never);
          const t = c.calculate({ ...base, [inp.id]: opt.value } as never);
          const zs = typeof z.score === 'number' ? z.score : parseFloat(String(z.score));
          const ts = typeof t.score === 'number' ? t.score : parseFloat(String(t.score));
          if (Number.isFinite(zs) && Number.isFinite(ts)) {
            foundNumeric = true;
            const d = ts - zs;
            if (Math.abs(d) > Math.abs(bestDelta)) bestDelta = d;
          }
        } catch {
          /* skip */
        }
      }

      if (!foundNumeric) continue;
      const declared = opt.points ?? 0;
      // If measured non-zero and differs from declared, or declared non-zero but measured 0 across all bases
      if (bestDelta !== declared) {
        // Prefer non-zero measured when declared is wrong
        fixes.push({
          calcId: c.id,
          inputId: inp.id,
          optionLabel: opt.label,
          declared,
          measured: bestDelta,
        });
      }
    }
  }
}

// Collapse to calcId+inputId -> measured for Yes-like options
const byKey = new Map<string, Fix>();
for (const f of fixes) {
  const k = `${f.calcId}::${f.inputId}`;
  const prev = byKey.get(k);
  if (!prev || f.optionLabel === 'Yes' || Math.abs(f.measured) > Math.abs(prev.measured)) {
    byKey.set(k, f);
  }
}

const list = [...byKey.values()];
console.log(`Smart mismatches: ${list.length}`);
for (const f of list.slice(0, 40)) {
  console.log(`${f.calcId}.${f.inputId}: declared=${f.declared} measured=${f.measured}`);
}
if (list.length > 40) console.log(`... and ${list.length - 40} more`);

// Apply yesNo third-arg updates in source files
const calcDir = path.join(process.cwd(), 'src/data/calculators');
const files = fs.readdirSync(calcDir).filter((f) => f.endsWith('.ts') && !f.startsWith('._') && f !== 'index.ts');

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

let fileUpdates = 0;
let repCount = 0;

for (const file of files) {
  const fp = path.join(calcDir, file);
  let content = fs.readFileSync(fp, 'utf8');
  const orig = content;

  for (const f of list) {
    if (!content.includes(`'${f.calcId}'`) && !content.includes(`"${f.calcId}"`)) continue;
    // Update yesNo('inputId', '...', ANYNUMBER
    const re = new RegExp(
      `(yesNo\\(\\s*['"]${escapeRe(f.inputId)}['"]\\s*,\\s*(['\`])(?:\\\\.|(?!\\2)[\\s\\S])*?\\2)\\s*,\\s*-?\\d+(?:\\.\\d+)?`,
      'g'
    );
    // Only within this calc - extract slice
    const idRe = new RegExp(`\\bid:\\s*['"]${escapeRe(f.calcId)}['"]`);
    const m = idRe.exec(content);
    if (!m) continue;
    let start = m.index;
    while (start > 0 && content[start] !== '{') start--;
    let depth = 0;
    let end = start;
    for (let i = start; i < content.length; i++) {
      if (content[i] === '{') depth++;
      else if (content[i] === '}') {
        depth--;
        if (depth === 0) {
          end = i + 1;
          break;
        }
      }
    }
    let slice = content.slice(start, end);
    const before = slice;
    slice = slice.replace(re, `$1, ${f.measured}`);
    // selectInput points for this input
    const selRe = new RegExp(
      `selectInput\\(\\s*['"]${escapeRe(f.inputId)}['"][\\s\\S]*?\\)`,
      'g'
    );
    slice = slice.replace(selRe, (block) => {
      if (f.optionLabel && f.optionLabel !== 'Yes') {
        // replace points on matching label line if present
        const labelEsc = escapeRe(f.optionLabel).replace(/'/g, "\\'");
        return block.replace(
          new RegExp(`(label:\\s*['"\`]${labelEsc}['"\`][\\s\\S]*?points:\\s*)-?\\d+(?:\\.\\d+)?`, 'g'),
          `$1${f.measured}`
        );
      }
      // yes-like: replace points matching declared
      return block.replace(
        new RegExp(`points:\\s*${escapeRe(String(f.declared))}(?!\\d)`, 'g'),
        `points: ${f.measured}`
      );
    });
    if (slice !== before) {
      content = content.slice(0, start) + slice + content.slice(end);
      repCount++;
    }
  }

  if (content !== orig) {
    fs.writeFileSync(fp, content);
    fileUpdates++;
    console.log('Updated', file);
  }
}

console.log(`Applied updates in ${fileUpdates} files (${repCount} input fixes)`);
fs.writeFileSync(
  path.join(process.cwd(), 'scripts/smart_point_mismatches.json'),
  JSON.stringify(list, null, 2)
);
