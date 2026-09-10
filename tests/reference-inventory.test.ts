import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
// @ts-expect-error -- plain .mjs module shared with the Python audit tools
import { extractAllRefs, CALC_DIR } from '../scripts/lib/reference-parser.mjs';
import { calculators } from '../src/data/calculators/index';

type ParsedRef = {
  file: string;
  line: number;
  calcId: string;
  calcName: string;
  title: string;
  citation: string;
  pmid: string | null;
  doi: string | null;
  url: string | null;
};

const parsed = extractAllRefs(CALC_DIR) as {
  files: string[];
  refs: ParsedRef[];
  sourceHash: string;
};

const byId = new Map(calculators.map((c) => [c.id, c]));

describe('reference inventory', () => {
  it('attributes every reference to the calculator that owns it', () => {
    const orphans = parsed.refs.filter((r) => !byId.has(r.calcId));
    const mismatched = parsed.refs.filter(
      (r) => byId.has(r.calcId) && byId.get(r.calcId)!.name !== r.calcName
    );
    expect(
      orphans.map((r) => `${r.file}:${r.line} calcId=${r.calcId}`),
      'references whose owning calculator id is not in the registry'
    ).toEqual([]);
    expect(
      mismatched.map((r) => `${r.calcId}: parsed "${r.calcName}" vs registry "${byId.get(r.calcId)!.name}"`),
      'references whose parsed calculator name disagrees with the registry'
    ).toEqual([]);
  });

  it('finds exactly the references the registry contains', () => {
    const expectedTotal = calculators.reduce(
      (n, c) => n + (c.evidence?.references?.length ?? 0),
      0
    );
    expect(parsed.refs.length).toBe(expectedTotal);

    const perCalc = new Map<string, number>();
    for (const r of parsed.refs) perCalc.set(r.calcId, (perCalc.get(r.calcId) ?? 0) + 1);
    const wrong = calculators
      .map((c) => ({
        id: c.id,
        registry: c.evidence?.references?.length ?? 0,
        parsed: perCalc.get(c.id) ?? 0,
      }))
      .filter((c) => c.registry !== c.parsed);
    expect(
      wrong.map((c) => `${c.id}: registry ${c.registry} vs parsed ${c.parsed}`),
      'per-calculator reference counts must match'
    ).toEqual([]);
  });

  it('reads identifiers without dropping or mangling them', () => {
    const registryRefs = calculators.flatMap((c) =>
      (c.evidence?.references ?? []).map((r) => ({ calcId: c.id, ...r }))
    );
    const key = (r: { calcId: string; title?: string; pmid?: string | null; doi?: string | null }) =>
      `${r.calcId}|${r.title ?? ''}|${r.pmid ?? ''}|${r.doi ?? ''}`;
    const parsedKeys = new Set(parsed.refs.map(key));
    const unmatched = registryRefs.filter((r) => !parsedKeys.has(key(r)));
    expect(
      unmatched.map((r) => `${r.calcId}: ${r.title}`),
      'registry references the parser failed to reproduce exactly'
    ).toEqual([]);
  });

  it('keeps the checked-in inventory in step with the sources', () => {
    const invPath = path.join('scripts', 'audit-evidence', 'refs-inventory.json');
    expect(fs.existsSync(invPath), `${invPath} is missing — run npm run audit:evidence`).toBe(true);
    const inv = JSON.parse(fs.readFileSync(invPath, 'utf8'));
    expect(
      inv.sourceHash,
      'checked-in inventory is stale — run npm run audit:evidence and commit the result'
    ).toBe(parsed.sourceHash);
    expect(inv.references.length).toBe(parsed.refs.length);
  });
});
