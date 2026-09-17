#!/usr/bin/env node
/**
 * Citation integrity check for the calculator registry.
 *
 * Offline (default): structural checks only — every reference needs a title,
 * citation and year; PMIDs must look like PMIDs (legacy records are as short as
 * five digits); DOIs must look like DOIs.
 *
 * `--network`: additionally resolve every PMID against NCBI E-utilities and
 * flag (a) identifiers that do not exist, (b) a declared year that disagrees
 * with the record, and (c) a declared DOI that disagrees with the DOI PubMed
 * holds for that PMID — the mismatch that a copy-pasted identifier produces.
 *
 * `--doi`: also resolve every distinct DOI against Crossref and report ones
 * that do not resolve.
 *
 * Usage:
 *   node scripts/check-citations.mjs
 *   node scripts/check-citations.mjs --network
 *   node scripts/check-citations.mjs --dir /tmp/calc-old        # compare a copy
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith('--')));
const dirIndex = args.indexOf('--dir');
const dataDir = dirIndex >= 0 ? args[dirIndex + 1] : 'src/data/calculators';
const EXCLUDE = /(^|\/)(index)\.ts$|\._\w/;

function stripFiles(list) {
  return list.filter((f) => !EXCLUDE.test(f) && f.endsWith('.ts'));
}

function field(block, name) {
  const single = new RegExp(`${name}:\\s*'((?:[^'\\\\]|\\\\.)*)'`).exec(block);
  if (single) return single[1];
  const double = new RegExp(`${name}:\\s*"((?:[^"\\\\]|\\\\.)*)"`).exec(block);
  if (double) return double[1];
  const bare = new RegExp(`${name}:\\s*([\\w./+-]+)`).exec(block);
  return bare ? bare[1] : '';
}

/** Years are written as bare numbers; everything else is a quoted string. */
function yearField(block) {
  const quoted = field(block, 'year');
  if (quoted) return quoted;
  const m = /year:\s*(\d{4})/.exec(block);
  return m ? m[1] : '';
}

/** Every `{ ... }` object that declares a title, gather its reference metadata. */
export function collectReferences(dir) {
  const refs = [];
  for (const file of stripFiles(readdirSync(dir))) {
    const text = readFileSync(join(dir, file), 'utf8');
    for (const m of text.matchAll(/references:\s*\[/g)) {
      let depth = 0;
      let end = m.index;
      for (let i = m.index + m[0].length - 1; i < text.length; i++) {
        if (text[i] === '[') depth++;
        else if (text[i] === ']' && --depth === 0) {
          end = i;
          break;
        }
      }
      const block = text.slice(m.index, end + 1);
      for (const obj of block.matchAll(/\{[^{}]*\}/gs)) {
        if (!obj[0].includes('title:')) continue;
        refs.push({
          file,
          title: field(obj[0], 'title'),
          citation: field(obj[0], 'citation'),
          year: yearField(obj[0]),
          pmid: field(obj[0], 'pmid'),
          doi: field(obj[0], 'doi'),
        });
      }
    }
  }
  return refs;
}

const problems = [];

export function structuralChecks(refs) {
  const issues = [];
  for (const r of refs) {
    if (!r.title.trim()) issues.push(`${r.file}: reference without a title (${r.citation || r.pmid || r.doi})`);
    if (!r.citation.trim()) issues.push(`${r.file}: "${r.title}" has no citation string`);
    if (!/^\d{4}$/.test(r.year)) issues.push(`${r.file}: "${r.title}" has no four-digit year`);
    if (r.pmid && !/^\d{1,9}$/.test(r.pmid)) issues.push(`${r.file}: "${r.title}" has a malformed PMID ${r.pmid}`);
    if (r.doi && !/^10\.\d{4,9}\//.test(r.doi)) issues.push(`${r.file}: "${r.title}" has a malformed DOI ${r.doi}`);
  }
  return issues;
}

function normalize(s) {
  return (s || '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
}

async function resolvePmids(refs, issues) {
  const pmids = [...new Set(refs.map((r) => r.pmid).filter(Boolean))];
  const records = new Map();
  for (let i = 0; i < pmids.length; i += 400) {
    const batch = pmids.slice(i, i + 400).join(',');
    const res = await fetch(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&retmode=json&id=${batch}`
    );
    if (!res.ok) throw new Error(`PubMed request failed: ${res.status}`);
    const json = await res.json();
    for (const uid of json.result.uids ?? []) records.set(uid, json.result[uid]);
  }
  for (const r of refs) {
    if (!r.pmid) continue;
    const rec = records.get(r.pmid);
    if (!rec) {
      issues.push(`MISSING PMID ${r.pmid} (${r.file}: "${r.title}")`);
      continue;
    }
    const pubYear = (rec.pubdate ?? '').slice(0, 4);
    if (r.year && pubYear && Math.abs(Number(pubYear) - Number(r.year)) > 1) {
      issues.push(`YEAR ${r.file}: "${r.title}" declares ${r.year}, PubMed says ${pubYear} (PMID ${r.pmid})`);
    }
    const pubDoi = (rec.articleids ?? []).find((a) => a.idtype === 'doi')?.value?.toLowerCase();
    if (r.doi && pubDoi && pubDoi !== r.doi.toLowerCase()) {
      issues.push(
        `DOI/PMID ${r.file}: "${r.title}" pairs PMID ${r.pmid} (${rec.title}) with DOI ${r.doi}, but PubMed records DOI ${pubDoi}`
      );
    }
    const words = normalize(r.title).split(' ').filter((w) => w.length > 3);
    const covered = words.filter((w) => normalize(rec.title).includes(w)).length;
    if (words.length >= 3 && covered / words.length < 0.4 && !r.doi) {
      issues.push(`TITLE ${r.file}: "${r.title}" looks unrelated to PMID ${r.pmid} ("${rec.title}")`);
    }
  }
}

async function resolveDois(refs, issues) {
  const dois = [...new Set(refs.map((r) => r.doi).filter(Boolean))];
  for (const doi of dois) {
    try {
      const res = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`);
      if (!res.ok) issues.push(`MISSING DOI ${doi} (HTTP ${res.status})`);
    } catch (error) {
      issues.push(`DOI ${doi} could not be resolved: ${error.message}`);
    }
  }
}

const refs = collectReferences(dataDir);
problems.push(...structuralChecks(refs));

if (flags.has('--network') || flags.has('--doi')) {
  await resolvePmids(refs, problems);
}
if (flags.has('--doi')) {
  await resolveDois(refs, problems);
}

console.log(`Checked ${refs.length} references in ${dataDir}`);
if (problems.length === 0) {
  console.log('No citation problems found.');
  process.exit(0);
}
console.log(`${problems.length} problem(s):`);
for (const p of problems) console.log(' -', p);
process.exit(1);
