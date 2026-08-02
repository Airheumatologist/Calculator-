/**
 * Aligns option points metadata with measured calculate() score deltas.
 * Reads OPTION_POINTS_MISMATCH from auto_audit_results.json.
 *
 * Rules:
 * - yesNo('id', 'label', N) → set N = actualDelta
 * - yesNo('id', 'label') → inject actualDelta as 3rd arg
 * - yesNo('id', 'label', 'help') → insert points before help when help is string
 * - select/option points: N near selectInput('id', ...) → actualDelta when declared matched
 */
import * as fs from 'fs';
import * as path from 'path';
import findings from './auto_audit_results.json';

type Finding = {
  calcId: string;
  type: string;
  details?: {
    inputId?: string;
    optionLabel?: string;
    declaredPoints?: number;
    actualDelta?: number;
  };
};

const mismatches = (findings as Finding[]).filter((f) => f.type === 'OPTION_POINTS_MISMATCH');

/** calcId → inputId → actualDelta (prefer Yes option) */
const desired = new Map<string, Map<string, { actual: number; declared: number }>>();
for (const f of mismatches) {
  const id = f.details?.inputId;
  if (!id || f.details?.actualDelta === undefined || f.details?.declaredPoints === undefined) continue;
  if (!desired.has(f.calcId)) desired.set(f.calcId, new Map());
  const map = desired.get(f.calcId)!;
  const prev = map.get(id);
  if (!prev || f.details.optionLabel === 'Yes') {
    map.set(id, { actual: f.details.actualDelta, declared: f.details.declaredPoints });
  }
}

const calcDir = path.join(process.cwd(), 'src/data/calculators');
const files = fs.readdirSync(calcDir).filter((f) => f.endsWith('.ts') && !f.startsWith('._') && f !== 'index.ts');

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Extract calculator object slice by id (best-effort brace matching from id: 'x') */
function extractCalcSlice(content: string, calcId: string): { start: number; end: number } | null {
  const re = new RegExp(`\\bid:\\s*['"]${escapeRe(calcId)}['"]`);
  const m = re.exec(content);
  if (!m) return null;
  // Walk backward to nearest `{` that starts the object
  let start = m.index;
  while (start > 0 && content[start] !== '{') start--;
  // Walk forward with brace depth
  let depth = 0;
  let end = start;
  for (let i = start; i < content.length; i++) {
    const ch = content[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }
  if (end <= start) return null;
  return { start, end };
}

function fixYesNoInSlice(slice: string, inputId: string, actual: number, declared: number): { slice: string; n: number } {
  let n = 0;
  let s = slice;

  // yesNo('id', `label`, NUMBER  or yesNo('id', 'label', NUMBER
  const withPts = new RegExp(
    `(yesNo\\(\\s*['"]${escapeRe(inputId)}['"]\\s*,\\s*(['\`])(?:\\\\.|(?!\\2)[\\s\\S])*?\\2)\\s*,\\s*${escapeRe(String(declared))}(?!\\d)`,
    'g'
  );
  s = s.replace(withPts, (_, head) => {
    n++;
    return `${head}, ${actual}`;
  });

  // yesNo('id', 'label', NUMBER) where NUMBER is default-like 1 but declared might already be wrong after first pass
  const anyPts = new RegExp(
    `(yesNo\\(\\s*['"]${escapeRe(inputId)}['"]\\s*,\\s*(['\`])(?:\\\\.|(?!\\2)[\\s\\S])*?\\2)\\s*,\\s*(-?\\d+(?:\\.\\d+)?)`,
    'g'
  );
  s = s.replace(anyPts, (full, head, _q, pts) => {
    if (Number(pts) === actual) return full;
    // only change if it was the declared mismatch or 1 (common default wrong)
    if (Number(pts) === declared || Number(pts) === 1) {
      n++;
      return `${head}, ${actual}`;
    }
    return full;
  });

  // bare yesNo('id', 'label') — no points arg
  const bare = new RegExp(
    `yesNo\\(\\s*['"]${escapeRe(inputId)}['"]\\s*,\\s*(['\`])((?:\\\\.|(?!\\1)[\\s\\S])*?)\\1\\s*\\)`,
    'g'
  );
  s = s.replace(bare, (_, q, label) => {
    n++;
    return `yesNo('${inputId}', ${q}${label}${q}, ${actual})`;
  });

  // yesNo('id', 'label', 'helpText') — string third arg is help, insert points
  const withHelp = new RegExp(
    `yesNo\\(\\s*['"]${escapeRe(inputId)}['"]\\s*,\\s*(['\`])((?:\\\\.|(?!\\1)[\\s\\S])*?)\\1\\s*,\\s*(['\`])((?:\\\\.|(?!\\3)[\\s\\S])*?)\\3\\s*\\)`,
    'g'
  );
  s = s.replace(withHelp, (_, q1, label, q2, help) => {
    n++;
    return `yesNo('${inputId}', ${q1}${label}${q1}, ${actual}, ${q2}${help}${q2})`;
  });

  return { slice: s, n };
}

function fixSelectPointsInSlice(slice: string, inputId: string, actual: number, declared: number): { slice: string; n: number } {
  let n = 0;
  // selectInput('inputId', 'label', [ ... points: declared ...
  const selRe = new RegExp(
    `selectInput\\(\\s*['"]${escapeRe(inputId)}['"]\\s*,[\\s\\S]*?\\)\\s*,?`,
    'g'
  );
  let s = slice;
  s = s.replace(selRe, (block) => {
    // Only rewrite points: declared → actual inside this block (option metadata)
    const fixed = block.replace(
      new RegExp(`points:\\s*${escapeRe(String(declared))}(?!\\d)`, 'g'),
      () => {
        n++;
        return `points: ${actual}`;
      }
    );
    return fixed;
  });

  // Inline options: id: 'inputId' ... options: [ { ..., points: declared
  const idBlock = new RegExp(
    `id:\\s*['"]${escapeRe(inputId)}['"][\\s\\S]{0,1200}?options:\\s*\\[[\\s\\S]*?\\]`,
    'g'
  );
  s = s.replace(idBlock, (block) =>
    block.replace(new RegExp(`points:\\s*${escapeRe(String(declared))}(?!\\d)`, 'g'), () => {
      n++;
      return `points: ${actual}`;
    })
  );

  return { slice: s, n };
}

let totalFiles = 0;
let totalFixes = 0;

for (const file of files) {
  const filePath = path.join(calcDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let fileFixes = 0;

  for (const [calcId, inputs] of desired) {
    if (!content.includes(`'${calcId}'`) && !content.includes(`"${calcId}"`)) continue;
    const range = extractCalcSlice(content, calcId);
    if (!range) continue;

    let slice = content.slice(range.start, range.end);
    for (const [inputId, { actual, declared }] of inputs) {
      if (actual === declared) continue;
      const a = fixYesNoInSlice(slice, inputId, actual, declared);
      slice = a.slice;
      fileFixes += a.n;
      const b = fixSelectPointsInSlice(slice, inputId, actual, declared);
      slice = b.slice;
      fileFixes += b.n;
    }
    content = content.slice(0, range.start) + slice + content.slice(range.end);
  }

  if (fileFixes > 0) {
    fs.writeFileSync(filePath, content);
    totalFiles++;
    totalFixes += fileFixes;
    console.log(`${file}: ${fileFixes} fixes`);
  }
}

console.log(`\nDone: ${totalFixes} fixes across ${totalFiles} files`);
console.log(`Target inputs: ${[...desired.values()].reduce((a, m) => a + m.size, 0)} across ${desired.size} calcs`);
