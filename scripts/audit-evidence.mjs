#!/usr/bin/env node
/**
 * Evidence reference audit for MedCalc Live.
 *
 * Usage:
 *   node scripts/audit-evidence.mjs
 *   node scripts/audit-evidence.mjs --json > evidence-audit.json
 *
 * Reports PMID / DOI / URL coverage across calculator references.
 * Does not call external APIs (offline scan of source only).
 */
import fs from 'node:fs';
import path from 'node:path';

const dir = path.join(process.cwd(), 'src/data/calculators');
const files = fs
  .readdirSync(dir)
  .filter((f) => f.endsWith('.ts') && !f.startsWith('._') && f !== 'index.ts');

function extractRefs(s, file) {
  const out = [];
  let idx = 0;
  while (true) {
    const start = s.indexOf('references:', idx);
    if (start < 0) break;
    const before = s.slice(Math.max(0, start - 2500), start);
    const ids = [...before.matchAll(/id:\s*'([^']+)'/g)];
    const calcId = ids.length ? ids[ids.length - 1][1] : '?';
    const bracket = s.indexOf('[', start);
    let depth = 0;
    let end = -1;
    for (let i = bracket; i < s.length; i++) {
      if (s[i] === '[') depth++;
      else if (s[i] === ']') {
        depth--;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    if (end < 0) break;
    const block = s.slice(bracket + 1, end);
    let d = 0;
    let o = -1;
    for (let i = 0; i < block.length; i++) {
      if (block[i] === '{') {
        if (d === 0) o = i;
        d++;
      } else if (block[i] === '}') {
        d--;
        if (d === 0 && o >= 0) {
          const body = block.slice(o, i + 1);
          if (/title:|citation:/.test(body)) {
            out.push({
              file,
              calcId,
              title: (body.match(/title:\s*'((?:\\'|[^'])*)'/) || [])[1] || '',
              citation: (body.match(/citation:\s*'((?:\\'|[^'])*)'/) || [])[1] || '',
              pmid: (body.match(/pmid:\s*'([^']*)'/) || [])[1],
              doi: (body.match(/doi:\s*'([^']*)'/) || [])[1],
              url: (body.match(/url:\s*'([^']*)'/) || [])[1],
              year: (() => {
                const m = body.match(/year:\s*(\d{4})/);
                return m ? +m[1] : null;
              })(),
            });
          }
          o = -1;
        }
      }
    }
    idx = end + 1;
  }
  return out;
}

const all = [];
for (const f of files) {
  all.push(...extractRefs(fs.readFileSync(path.join(dir, f), 'utf8'), f));
}

const withPmid = all.filter((r) => r.pmid);
const withDoi = all.filter((r) => r.doi);
const withUrl = all.filter((r) => r.url);
const anyLink = all.filter((r) => r.pmid || r.doi || r.url);
const noLink = all.filter((r) => !r.pmid && !r.doi && !r.url);
const pmidNoDoi = all.filter((r) => r.pmid && !r.doi);

const report = {
  files: files.length,
  refs: all.length,
  withPmid: withPmid.length,
  withDoi: withDoi.length,
  withUrl: withUrl.length,
  anyLink: anyLink.length,
  noLink: noLink.length,
  pmidNoDoi: pmidNoDoi.length,
  pctPmid: +((100 * withPmid.length) / all.length).toFixed(1),
  pctDoi: +((100 * withDoi.length) / all.length).toFixed(1),
  pctAnyLink: +((100 * anyLink.length) / all.length).toFixed(1),
  noLinkSample: noLink.slice(0, 25).map((r) => ({
    file: r.file,
    calcId: r.calcId,
    citation: r.citation.slice(0, 100),
  })),
};

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ report, refs: all }, null, 2));
} else {
  console.log('MedCalc Live — evidence audit');
  console.log('------------------------------');
  console.log(`References:     ${report.refs}`);
  console.log(`With PMID:      ${report.withPmid} (${report.pctPmid}%)`);
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
