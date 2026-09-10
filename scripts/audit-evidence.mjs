#!/usr/bin/env node
/**
 * Evidence reference audit for MedCalc Live — the authoritative inventory pass.
 *
 * Usage:
 *   npm run audit:evidence            # print stats, write inventory + report
 *   node scripts/audit-evidence.mjs --json > evidence-audit.json
 *   node scripts/audit-evidence.mjs --no-write
 *
 * Parsing lives in scripts/lib/reference-parser.mjs; every other audit tool
 * consumes the inventory JSON this script writes instead of re-parsing the
 * TypeScript sources.
 *
 * Offline: reads source only, never calls an external API.
 */
import fs from 'node:fs';
import path from 'node:path';
import { extractAllRefs, summarize } from './lib/reference-parser.mjs';

const CALC_DIR = path.join(process.cwd(), 'src/data/calculators');
const OUT_DIR = path.join(process.cwd(), 'scripts/audit-evidence');
export const INVENTORY_PATH = path.join(OUT_DIR, 'refs-inventory.json');
const REPORT_PATH = path.join(OUT_DIR, 'EVIDENCE-AUDIT.md');

const { files, refs, sourceHash } = extractAllRefs(CALC_DIR);
const report = summarize(refs, files);

const inventory = {
  schema: 'medcalc-refs-inventory/1',
  generatedBy: 'scripts/audit-evidence.mjs',
  generatedAt: new Date().toISOString(),
  sourceDir: 'src/data/calculators',
  sourceFiles: files,
  sourceHash,
  summary: report,
  references: refs,
};

function markdown() {
  const s = report;
  const byFile = new Map();
  for (const r of refs) byFile.set(r.file, (byFile.get(r.file) ?? 0) + 1);
  return [
    '# Evidence reference audit — authoritative report',
    '',
    '<!-- GENERATED FILE. Do not edit by hand. Regenerate with: npm run audit:evidence -->',
    '',
    `Generated: ${inventory.generatedAt}`,
    `Source: \`src/data/calculators/*.ts\` (${s.files} files, sha256 \`${sourceHash.slice(0, 16)}…\`)`,
    '',
    'This file and `refs-inventory.json` are the only authoritative evidence-audit',
    'outputs in this repository. Both come from the same parser',
    '(`scripts/lib/reference-parser.mjs`), so the counts here always match what',
    '`npm run validate:pmids` and `npm run audit:relevance` report.',
    '',
    '## Coverage',
    '',
    '| Metric | Count |',
    '|--------|------:|',
    `| Calculator source files | ${s.files} |`,
    `| Calculators with references | ${s.calculatorsWithRefs} |`,
    `| Total references | ${s.refs} |`,
    `| With PMID | ${s.withPmid} (${s.pctPmid}%) |`,
    `| Unique PMIDs | ${s.uniquePmids} |`,
    `| With DOI | ${s.withDoi} (${s.pctDoi}%) |`,
    `| Unique DOIs | ${s.uniqueDois} |`,
    `| With direct URL | ${s.withUrl} |`,
    `| URL only (no PMID, no DOI) | ${s.urlOnly} |`,
    `| Without a PMID | ${s.noPmid} |`,
    `| PMID without DOI | ${s.pmidNoDoi} |`,
    `| With at least one identifier or link | ${s.anyLink} (${s.pctAnyLink}%) |`,
    `| Without any identifier or link | ${s.noLink} |`,
    '',
    '## References per source file',
    '',
    '| File | References |',
    '|------|-----------:|',
    ...[...byFile.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([f, n]) => `| \`${f}\` | ${n} |`),
    '',
    '## Notes',
    '',
    '- Reference *resolution* (does each PMID exist in PubMed) is checked by',
    '  `npm run validate:pmids`, which needs network access and is not part of',
    '  the build.',
    '- Reference *relevance* (does each PMID match the calculator) is checked by',
    '  `npm run audit:relevance`. That check is a heuristic title-token overlap',
    '  score: citations such as EDACS and sPESI score as mismatches because the',
    '  stored title uses the acronym while PubMed stores the expanded phrase.',
    '  Those are known false positives, not citation errors.',
    '- The last curated relevance pass (archived under `archive/`) resolved every',
    '  confirmed mismatch; it ended at 0 confirmed mismatches and 1 soft suspect.',
    '',
  ].join('\n');
}

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ report, refs }, null, 2));
} else {
  console.log('MedCalc Live — evidence audit');
  console.log('------------------------------');
  console.log(`Source files:   ${report.files}`);
  console.log(`References:     ${report.refs}`);
  console.log(`With PMID:      ${report.withPmid} (${report.pctPmid}%)`);
  console.log(`Unique PMIDs:   ${report.uniquePmids}`);
  console.log(`With DOI:       ${report.withDoi} (${report.pctDoi}%)`);
  console.log(`With URL:       ${report.withUrl}`);
  console.log(`Any link:       ${report.anyLink} (${report.pctAnyLink}%)`);
  console.log(`No identifiers: ${report.noLink}`);
  console.log(`PMID w/o DOI:   ${report.pmidNoDoi}`);
  if (report.noLinkSample.length) {
    console.log('\nUnlinked sample:');
    for (const r of report.noLinkSample) {
      console.log(`  [${r.file}/${r.calcId}] ${r.citation}`);
    }
  }
}

if (!process.argv.includes('--no-write')) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(INVENTORY_PATH, JSON.stringify(inventory, null, 2) + '\n');
  fs.writeFileSync(REPORT_PATH, markdown());
  if (!process.argv.includes('--json')) {
    console.log(`\nWrote ${path.relative(process.cwd(), INVENTORY_PATH)}`);
    console.log(`Wrote ${path.relative(process.cwd(), REPORT_PATH)}`);
  }
}
