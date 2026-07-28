#!/usr/bin/env python3
"""
Auto-fix mismatched PMIDs/DOIs by searching PubMed for the cited paper.

Reads scripts/audit-evidence/pmid-v2-problems.json (mismatch + doi_wrong),
searches NCBI for each citation, and patches src/data/calculators/*.ts.

Usage:
  python3 scripts/fix-pmid-mismatches.py --dry-run
  python3 scripts/fix-pmid-mismatches.py --apply
  python3 scripts/fix-pmid-mismatches.py --apply --only khorana,rcri
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
import time
import urllib.parse
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CALC_DIR = ROOT / "src" / "data" / "calculators"
PROBLEMS = ROOT / "scripts" / "audit-evidence" / "pmid-v2-problems.json"
OUT = ROOT / "scripts" / "audit-evidence" / "pmid-fix-results.json"


def curl_json(url: str, timeout: int = 40) -> dict:
    r = subprocess.run(
        ["curl", "-sS", "--max-time", str(timeout), "-A", "MedCalcLiveAudit/1.0", url],
        capture_output=True,
        text=True,
    )
    if r.returncode != 0:
        raise RuntimeError(r.stderr or "curl failed")
    if not r.stdout.strip():
        raise RuntimeError("empty")
    return json.loads(r.stdout)


def esearch(term: str, retmax: int = 8) -> list[str]:
    params = urllib.parse.urlencode(
        {
            "db": "pubmed",
            "term": term,
            "retmax": str(retmax),
            "retmode": "json",
            "sort": "relevance",
        }
    )
    url = f"https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?{params}"
    data = curl_json(url)
    return data.get("esearchresult", {}).get("idlist", []) or []


def esummary(pmids: list[str]) -> dict[str, dict]:
    if not pmids:
        return {}
    params = urllib.parse.urlencode(
        {"db": "pubmed", "id": ",".join(pmids), "retmode": "json"}
    )
    url = f"https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?{params}"
    data = curl_json(url)
    out = {}
    for pid in pmids:
        m = data.get("result", {}).get(pid, {})
        if not isinstance(m, dict) or not m.get("title"):
            continue
        doi = None
        for aid in m.get("articleids") or []:
            if aid.get("idtype") == "doi":
                doi = aid.get("value")
        out[pid] = {
            "title": m.get("title", "").rstrip("."),
            "authors": [a.get("name") for a in (m.get("authors") or [])[:6]],
            "pubdate": m.get("pubdate"),
            "source": m.get("source"),
            "doi": doi,
        }
    return out


def tokens(text: str) -> set[str]:
    text = (text or "").lower()
    text = re.sub(r"[^\w\s\-]", " ", text)
    stop = {
        "a", "an", "the", "of", "and", "or", "in", "on", "for", "to", "with", "from",
        "by", "at", "as", "is", "are", "was", "were", "study", "studies", "patients",
        "patient", "clinical", "et", "al", "using", "use", "based", "new", "among",
        "between", "after", "before", "during", "over", "under", "into", "via",
    }
    out = set()
    for t in text.replace("-", " ").split():
        if len(t) < 3 or t in stop or t.isdigit():
            continue
        out.add(t)
    return out


def score_candidate(problem: dict, cand: dict) -> float:
    exp = tokens(
        " ".join(
            [
                problem.get("calcName") or "",
                problem.get("title") or "",
                problem.get("citation") or "",
                problem.get("calcId") or "",
            ]
        )
    )
    act = tokens(cand.get("title") or "")
    overlap = exp & act
    score = len(overlap) / max(3, min(len(exp), 12))

    cit = problem.get("citation") or ""
    m = re.match(r"([A-Z][A-Za-z\-']+)", cit.strip())
    author = m.group(1).lower() if m else None
    years = re.findall(r"\b(19\d{2}|20\d{2})\b", cit)
    year = problem.get("year") or (int(years[-1]) if years else None)

    authors = [a.split()[0].lower() for a in (cand.get("authors") or []) if a]
    if author and author in authors:
        score += 0.55
    elif author and any(author in a or a in author for a in authors):
        score += 0.4

    if year and cand.get("pubdate") and str(year) in str(cand["pubdate"]):
        score += 0.25

    # boost if claimed title words appear
    claimed = tokens(problem.get("title") or "")
    if claimed:
        score += 0.35 * (len(claimed & act) / max(1, len(claimed)))

    return score


def build_queries(problem: dict) -> list[str]:
    cit = problem.get("citation") or ""
    title = problem.get("title") or ""
    calc = problem.get("calcName") or ""
    m = re.match(r"([A-Z][A-Za-z\-']+)", cit.strip())
    author = m.group(1) if m else None
    years = re.findall(r"\b(19\d{2}|20\d{2})\b", cit)
    year = problem.get("year") or (int(years[-1]) if years else None)

    # title phrase without parentheticals
    clean_title = re.sub(r"\([^)]*\)", "", title).strip()
    clean_title = re.sub(r"\s+", " ", clean_title)
    # take first 8 content words
    twords = [w for w in re.findall(r"[A-Za-z0-9\-\']+", clean_title) if len(w) > 2][:10]
    title_q = " ".join(twords)

    qs = []
    if author and year and title_q:
        qs.append(f'{author}[Author] AND {year}[PDAT] AND ({title_q})')
    if author and year:
        qs.append(f"{author}[Author] AND {year}[PDAT]")
    if author and title_q:
        qs.append(f"{author}[Author] AND ({title_q})")
    if title_q:
        qs.append(title_q)
    # acronym / calc name
    short = problem.get("calcId") or ""
    if short and author:
        qs.append(f"{author}[Author] AND {short}")
    if calc and author and year:
        # first few words of calc name
        cwords = " ".join(re.findall(r"[A-Za-z0-9]+", calc)[:6])
        qs.append(f"{author}[Author] AND {year}[PDAT] AND {cwords}")
    # de-dupe
    seen = set()
    out = []
    for q in qs:
        if q not in seen:
            seen.add(q)
            out.append(q)
    return out


def find_best(problem: dict) -> dict | None:
    best = None
    best_score = -1.0
    tried = set()
    for q in build_queries(problem):
        try:
            ids = esearch(q, retmax=8)
        except Exception as e:
            print(f"  search fail: {e}", file=sys.stderr)
            time.sleep(1)
            continue
        time.sleep(0.34)
        ids = [i for i in ids if i not in tried]
        if not ids:
            continue
        tried.update(ids)
        try:
            meta = esummary(ids)
        except Exception as e:
            print(f"  summary fail: {e}", file=sys.stderr)
            time.sleep(1)
            continue
        time.sleep(0.34)
        for pid, cand in meta.items():
            sc = score_candidate(problem, cand)
            if sc > best_score:
                best_score = sc
                best = {
                    "pmid": pid,
                    "score": round(sc, 3),
                    "query": q,
                    **cand,
                }
        # early exit if strong
        if best_score >= 0.9:
            break
    if best and best_score >= 0.55:
        return best
    if best:
        best["rejected"] = True
        best["reject_reason"] = f"low score {best_score}"
        return best
    return None


def patch_file(file_name: str, old_pmid: str | None, new_pmid: str, new_doi: str | None, old_doi: str | None) -> bool:
    path = CALC_DIR / file_name
    text = path.read_text(encoding="utf-8")
    original = text

    if old_pmid and old_pmid in text:
        # Replace pmid near this occurrence carefully — replace all identical wrong pmids in file
        # may over-replace if same wrong pmid used elsewhere for different papers (rare)
        text = text.replace(f"pmid: '{old_pmid}'", f"pmid: '{new_pmid}'")
        text = text.replace(f'pmid: "{old_pmid}"', f'pmid: "{new_pmid}"')

    if new_doi:
        if old_doi and old_doi in text:
            text = text.replace(f"doi: '{old_doi}'", f"doi: '{new_doi}'")
            text = text.replace(f'doi: "{old_doi}"', f'doi: "{new_doi}"')
        elif old_pmid:
            # insert doi after pmid if missing
            pattern = rf"(pmid:\s*'{re.escape(new_pmid)}')(\s*,?)"
            def repl(m):
                # if next nearby has doi, leave
                return m.group(0)
            # only add doi if the pmid line doesn't already have doi on same object — handled separately
            pass

    if text == original:
        return False
    path.write_text(text, encoding="utf-8")
    return True


def patch_reference_block(
    file_name: str,
    old_pmid: str | None,
    old_doi: str | None,
    new_pmid: str,
    new_doi: str | None,
    citation_hint: str | None = None,
) -> bool:
    """Replace pmid/doi within the reference object that matches old identifiers."""
    path = CALC_DIR / file_name
    text = path.read_text(encoding="utf-8")

    # Find reference objects containing old pmid
    if not old_pmid:
        return False

    # Work object-by-object for references arrays is hard; use local window around pmid
    idx = 0
    replaced = False
    while True:
        pos = text.find(f"pmid: '{old_pmid}'", idx)
        if pos < 0:
            pos = text.find(f'pmid: "{old_pmid}"', idx)
        if pos < 0:
            break

        # window for this object
        start = text.rfind("{", 0, pos)
        end = text.find("}", pos)
        if start < 0 or end < 0:
            idx = pos + 1
            continue
        block = text[start : end + 1]
        new_block = block.replace(f"pmid: '{old_pmid}'", f"pmid: '{new_pmid}'")
        new_block = new_block.replace(f'pmid: "{old_pmid}"', f'pmid: "{new_pmid}"')

        if new_doi:
            if old_doi and f"doi: '{old_doi}'" in new_block:
                new_block = new_block.replace(f"doi: '{old_doi}'", f"doi: '{new_doi}'")
            elif old_doi and f'doi: "{old_doi}"' in new_block:
                new_block = new_block.replace(f'doi: "{old_doi}"', f'doi: "{new_doi}"')
            elif re.search(r"doi:\s*'", new_block):
                new_block = re.sub(r"doi:\s*'[^']*'", f"doi: '{new_doi}'", new_block, count=1)
            else:
                # insert doi after pmid
                new_block = re.sub(
                    rf"(pmid:\s*'{re.escape(new_pmid)}')(\s*,?)",
                    rf"\1,\n          doi: '{new_doi}'\2",
                    new_block,
                    count=1,
                )

        if new_block != block:
            text = text[:start] + new_block + text[end + 1 :]
            replaced = True
            idx = start + len(new_block)
        else:
            idx = pos + 1

    if replaced:
        path.write_text(text, encoding="utf-8")
    return replaced


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--only", type=str, default="")
    ap.add_argument("--limit", type=int, default=0)
    args = ap.parse_args()
    if not args.apply and not args.dry_run:
        args.dry_run = True

    problems = json.loads(PROBLEMS.read_text())
    problems = [p for p in problems if p.get("verdict") in ("mismatch", "doi_wrong")]
    if args.only:
        allow = set(args.only.split(","))
        problems = [p for p in problems if p.get("calcId") in allow]
    if args.limit:
        problems = problems[: args.limit]

    print(f"Processing {len(problems)} problems…", file=sys.stderr)
    results = []

    for i, p in enumerate(problems):
        print(
            f"[{i+1}/{len(problems)}] {p.get('calcId')} pmid={p.get('pmid')} — {p.get('citation','')[:60]}",
            file=sys.stderr,
        )

        # doi_wrong only: use pubmed_doi from audit if available
        if p.get("verdict") == "doi_wrong" and p.get("pubmed_doi"):
            fix = {
                "pmid": p["pmid"],
                "doi": p["pubmed_doi"],
                "title": p.get("pubmed_title"),
                "score": 1.0,
                "query": "audit-doi-fix",
            }
        else:
            fix = find_best(p)

        row = {
            "calcId": p.get("calcId"),
            "file": p.get("file"),
            "old_pmid": p.get("pmid"),
            "old_doi": p.get("doi"),
            "citation": p.get("citation"),
            "claimed_title": p.get("title"),
            "old_pubmed_title": p.get("pubmed_title"),
            "fix": fix,
        }

        if fix and not fix.get("rejected"):
            new_pmid = fix["pmid"]
            new_doi = fix.get("doi")
            row["status"] = "resolved"
            if args.apply:
                ok = patch_reference_block(
                    p["file"],
                    p.get("pmid"),
                    p.get("doi"),
                    new_pmid,
                    new_doi,
                )
                row["patched"] = ok
                print(
                    f"  → PMID {new_pmid} DOI {new_doi} score={fix.get('score')} patched={ok}",
                    file=sys.stderr,
                )
                print(f"     {fix.get('title','')[:100]}", file=sys.stderr)
            else:
                print(
                    f"  → would set PMID {new_pmid} DOI {new_doi} score={fix.get('score')}",
                    file=sys.stderr,
                )
                print(f"     {fix.get('title','')[:100]}", file=sys.stderr)
        else:
            row["status"] = "needs_manual"
            print(f"  → NEEDS MANUAL (best={fix})", file=sys.stderr)

        results.append(row)
        time.sleep(0.15)

    OUT.write_text(json.dumps(results, indent=2))
    resolved = sum(1 for r in results if r["status"] == "resolved")
    manual = sum(1 for r in results if r["status"] == "needs_manual")
    patched = sum(1 for r in results if r.get("patched"))
    print(
        json.dumps(
            {
                "total": len(results),
                "resolved": resolved,
                "needs_manual": manual,
                "patched": patched,
                "out": str(OUT),
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
