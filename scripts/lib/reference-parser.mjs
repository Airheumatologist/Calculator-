/**
 * Shared parser for calculator evidence references.
 *
 * This module is the single source of truth for "what references exist in
 * src/data/calculators/*.ts". Every audit tool (JS or Python) must go through
 * it, either by importing it or by consuming the inventory JSON that
 * scripts/audit-evidence.mjs emits from it.
 *
 * It is a string-aware scanner rather than a set of regexes: reference fields
 * are written with single quotes, double quotes and template literals in the
 * data files, and apostrophes inside double-quoted values used to break
 * quote-specific regexes silently.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const CALC_DIR = path.join('src', 'data', 'calculators');

export function listCalculatorFiles(dir) {
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.ts') && !f.startsWith('._') && f !== 'index.ts')
    .sort();
}

/**
 * Mark every character that sits inside a string literal or a comment.
 * Returns { code, mask } where mask[i] is true when s[i] is *code*, i.e. safe
 * to match structural characters against.
 */
function scanMask(s) {
  const mask = new Uint8Array(s.length);
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === '/' && s[i + 1] === '/') {
      while (i < s.length && s[i] !== '\n') i++;
      continue;
    }
    if (c === '/' && s[i + 1] === '*') {
      i += 2;
      while (i < s.length && !(s[i] === '*' && s[i + 1] === '/')) i++;
      i += 2;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') {
      const quote = c;
      i++;
      while (i < s.length) {
        if (s[i] === '\\') {
          i += 2;
          continue;
        }
        if (s[i] === quote) {
          i++;
          break;
        }
        i++;
      }
      continue;
    }
    mask[i] = 1;
    i++;
  }
  return mask;
}

function unescapeLiteral(raw) {
  let out = '';
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] === '\\' && i + 1 < raw.length) {
      const n = raw[i + 1];
      if (n === 'n') out += '\n';
      else if (n === 't') out += '\t';
      else if (n === 'r') out += '\r';
      else out += n;
      i++;
      continue;
    }
    out += raw[i];
  }
  return out;
}

/** Read a quoted string literal starting at s[start] (any of ' " `). */
function readString(s, start) {
  const quote = s[start];
  if (quote !== "'" && quote !== '"' && quote !== '`') return null;
  let i = start + 1;
  let raw = '';
  while (i < s.length) {
    if (s[i] === '\\') {
      raw += s[i] + (s[i + 1] ?? '');
      i += 2;
      continue;
    }
    if (s[i] === quote) return { value: unescapeLiteral(raw), end: i + 1 };
    raw += s[i];
    i++;
  }
  return null;
}

/** Find `key:` inside [from,to) at code level and return its string value. */
function readField(s, mask, from, to, key) {
  const needle = key + ':';
  let idx = from;
  while (idx < to) {
    const hit = s.indexOf(needle, idx);
    if (hit < 0 || hit >= to) return undefined;
    // must be a real key: at code level and not a suffix of a longer identifier
    const prev = s[hit - 1];
    if (mask[hit] && !/[A-Za-z0-9_$]/.test(prev ?? ' ')) {
      let j = hit + needle.length;
      while (j < to && /\s/.test(s[j])) j++;
      const str = readString(s, j);
      if (str) return str.value;
      const num = /^-?\d+(\.\d+)?/.exec(s.slice(j, Math.min(to, j + 32)));
      if (num) return num[0];
      return undefined;
    }
    idx = hit + needle.length;
  }
  return undefined;
}

function matchBracket(s, mask, from, open, close) {
  let depth = 0;
  for (let i = from; i < s.length; i++) {
    if (!mask[i]) continue;
    if (s[i] === open) depth++;
    else if (s[i] === close) {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/**
 * Every object literal in the file, as { open, close, depth }, innermost last
 * for a given position. One pass, so callers can look up an owning object
 * instead of guessing with a bounded backward scan.
 */
function parseObjects(s, mask) {
  const objects = [];
  const stack = [];
  for (let i = 0; i < s.length; i++) {
    if (!mask[i]) continue;
    if (s[i] === '{') {
      stack.push(i);
    } else if (s[i] === '}' && stack.length) {
      const open = stack.pop();
      objects.push({ open, close: i, depth: stack.length });
    }
  }
  return objects.sort((a, b) => a.open - b.open);
}

/**
 * Read `key: 'value'` only when it is a direct key of the object spanning
 * (open, close) — nested objects, arrays and function bodies are skipped, so a
 * `name` inside calculate() cannot be mistaken for the calculator's name.
 */
function readDirectField(s, mask, open, close, key) {
  const needle = key + ':';
  let depth = 0;
  for (let i = open + 1; i < close; i++) {
    if (!mask[i]) continue;
    const c = s[i];
    if (c === '{' || c === '[' || c === '(') {
      depth++;
      continue;
    }
    if (c === '}' || c === ']' || c === ')') {
      depth--;
      continue;
    }
    if (depth !== 0) continue;
    if (c !== key[0] || !s.startsWith(needle, i)) continue;
    const prev = s[i - 1];
    if (/[A-Za-z0-9_$]/.test(prev ?? ' ')) continue;
    let j = i + needle.length;
    while (j < close && /\s/.test(s[j])) j++;
    const str = readString(s, j);
    if (str) return str.value;
    const num = /^-?\d+(\.\d+)?/.exec(s.slice(j, Math.min(close, j + 32)));
    if (num) return num[0];
    return undefined;
  }
  return undefined;
}

/**
 * The calculator object that owns the reference block at `pos`: the innermost
 * enclosing object literal that declares its own `id`. References sit inside
 * `evidence: {...}` inside the calculator, so the owner is an ancestor, never
 * the innermost object.
 */
function findOwningCalculator(s, mask, objects, pos) {
  const ancestors = objects
    .filter((o) => o.open < pos && o.close > pos)
    .sort((a, b) => b.depth - a.depth);
  for (const o of ancestors) {
    const id = readDirectField(s, mask, o.open, o.close, 'id');
    if (id) {
      return { calcId: id, calcName: readDirectField(s, mask, o.open, o.close, 'name') ?? '?' };
    }
  }
  return { calcId: '?', calcName: '?' };
}

/** Extract every reference object from one calculator source file. */
export function extractRefsFromSource(source, file) {
  const mask = scanMask(source);
  const objects = parseObjects(source, mask);
  const out = [];
  let idx = 0;
  while (true) {
    const start = source.indexOf('references:', idx);
    if (start < 0) break;
    if (!mask[start]) {
      idx = start + 11;
      continue;
    }
    const { calcId, calcName } = findOwningCalculator(source, mask, objects, start);

    let bracket = start + 'references:'.length;
    while (bracket < source.length && /\s/.test(source[bracket])) bracket++;
    if (source[bracket] !== '[') {
      idx = start + 11;
      continue;
    }
    const end = matchBracket(source, mask, bracket, '[', ']');
    if (end < 0) break;

    let depth = 0;
    let open = -1;
    for (let i = bracket + 1; i < end; i++) {
      if (!mask[i]) continue;
      if (source[i] === '{') {
        if (depth === 0) open = i;
        depth++;
      } else if (source[i] === '}') {
        depth--;
        if (depth === 0 && open >= 0) {
          const from = open;
          const to = i + 1;
          const hasTitle = readField(source, mask, from, to, 'title') !== undefined;
          const hasCitation = readField(source, mask, from, to, 'citation') !== undefined;
          if (hasTitle || hasCitation) {
            const yearRaw = readField(source, mask, from, to, 'year');
            out.push({
              file,
              calcId,
              calcName,
              title: readField(source, mask, from, to, 'title') ?? '',
              citation: readField(source, mask, from, to, 'citation') ?? '',
              pmid: readField(source, mask, from, to, 'pmid') ?? null,
              doi: readField(source, mask, from, to, 'doi') ?? null,
              url: readField(source, mask, from, to, 'url') ?? null,
              year: yearRaw ? Number.parseInt(yearRaw, 10) : null,
              line: source.slice(0, from).split('\n').length,
            });
          }
          open = -1;
        }
      }
    }
    idx = end + 1;
  }
  return out;
}

/**
 * Parse every calculator file under `dir`.
 * Returns { files, refs, sourceHash } where sourceHash covers the exact bytes
 * that produced `refs`, so consumers can detect a stale inventory.
 */
export function extractAllRefs(dir) {
  const files = listCalculatorFiles(dir);
  const hash = crypto.createHash('sha256');
  const refs = [];
  for (const f of files) {
    const source = fs.readFileSync(path.join(dir, f), 'utf8');
    hash.update(f).update('\0').update(source).update('\0');
    refs.push(...extractRefsFromSource(source, f));
  }
  return { files, refs, sourceHash: hash.digest('hex') };
}

export function summarize(refs, files) {
  const withPmid = refs.filter((r) => r.pmid);
  const withDoi = refs.filter((r) => r.doi);
  const withUrl = refs.filter((r) => r.url);
  const anyLink = refs.filter((r) => r.pmid || r.doi || r.url);
  const noLink = refs.filter((r) => !r.pmid && !r.doi && !r.url);
  const pct = (n) => +((100 * n) / (refs.length || 1)).toFixed(1);
  return {
    files: files.length,
    calculatorsWithRefs: new Set(refs.map((r) => r.calcId)).size,
    refs: refs.length,
    withPmid: withPmid.length,
    uniquePmids: new Set(withPmid.map((r) => r.pmid)).size,
    withDoi: withDoi.length,
    uniqueDois: new Set(withDoi.map((r) => r.doi)).size,
    withUrl: withUrl.length,
    anyLink: anyLink.length,
    noLink: noLink.length,
    pmidNoDoi: refs.filter((r) => r.pmid && !r.doi).length,
    urlOnly: refs.filter((r) => r.url && !r.pmid && !r.doi).length,
    noPmid: refs.length - withPmid.length,
    pctPmid: pct(withPmid.length),
    pctDoi: pct(withDoi.length),
    pctAnyLink: pct(anyLink.length),
    noLinkSample: noLink.slice(0, 25).map((r) => ({
      file: r.file,
      calcId: r.calcId,
      citation: r.citation.slice(0, 100),
    })),
  };
}
