#!/usr/bin/env python3
"""
Audit PMID/DOI relevance for calculator evidence references.

1. Extract refs with calculator context from src/data/calculators/*.ts
2. Fetch PubMed titles for all PMIDs via NCBI E-utilities
3. Optionally fetch Crossref titles for DOIs
4. Score token overlap between PubMed/Crossref title vs calc name + ref title + citation
5. Write full report + mismatches for agent waves

Usage:
  python3 scripts/audit-pmid-relevance.py
  python3 scripts/audit-pmid-relevance.py --skip-doi
  python3 scripts/audit-pmid-relevance.py --limit 50   # smoke test
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
import time
import urllib.parse
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CALC_DIR = ROOT / "src" / "data" / "calculators"
OUT_DIR = ROOT / "scripts" / "audit-evidence"

STOPWORDS = {
    "a", "an", "the", "of", "and", "or", "in", "on", "for", "to", "with", "from",
    "by", "at", "as", "is", "are", "was", "were", "be", "been", "being", "that",
    "this", "these", "those", "its", "it", "into", "via", "vs", "versus", "using",
    "use", "used", "based", "study", "studies", "patients", "patient", "clinical",
    "score", "scores", "risk", "index", "criteria", "rule", "rules", "scale",
    "assessment", "evaluation", "prediction", "predictive", "model", "models",
    "development", "validation", "validated", "prospective", "retrospective",
    "multicenter", "randomised", "randomized", "trial", "trials", "cohort",
    "analysis", "review", "systematic", "meta", "et", "al", "among", "between",
    "after", "before", "during", "over", "under", "new", "novel", "update",
    "updated", "revised", "version", "adult", "adults", "children", "pediatric",
    "emergency", "department", "hospital", "medical", "medicine", "journal",
    "volume", "issue", "pp", "pages", "doi", "pmid", "pubmed", "https", "http",
    "www", "com", "org", "edu", "gov", "year", "years", "month", "months",
    "day", "days", "one", "two", "three", "four", "five", "six", "seven",
    "eight", "nine", "ten", "first", "second", "third", "level", "high", "low",
    "mild", "moderate", "severe", "acute", "chronic", "primary", "secondary",
    "outcomes", "outcome", "mortality", "survival", "performance", "comparison",
    "associated", "association", "related", "relation", "effect", "effects",
    "impact", "role", "value", "values", "utility", "accuracy", "diagnostic",
    "prognostic", "therapeutic", "treatment", "management", "guideline",
    "guidelines", "recommendation", "recommendations", "consensus", "statement",
    "international", "american", "european", "society", "association", "college",
    "academy", "institute", "national", "world", "health", "care", "practice",
}


def tokenize(text: str) -> set[str]:
    if not text:
        return set()
    # normalize unicode superscripts etc
    text = text.lower()
    text = re.sub(r"[^\w\s\-]", " ", text)
    text = text.replace("_", " ").replace("-", " ")
    tokens = set()
    for t in text.split():
        if len(t) < 3:
            continue
        if t.isdigit():
            continue
        if t in STOPWORDS:
            continue
        tokens.add(t)
        # keep alphanumeric stems like cha2ds2
        if any(c.isdigit() for c in t) and any(c.isalpha() for c in t):
            tokens.add(re.sub(r"\d+", "", t) or t)
    return tokens


def score_relevance(expected_blob: str, actual_title: str) -> dict:
    exp = tokenize(expected_blob)
    act = tokenize(actual_title)
    if not exp or not act:
        return {"score": 0.0, "overlap": [], "exp_n": len(exp), "act_n": len(act)}
    overlap = sorted(exp & act)
    # jaccard-like but asymmetric: prefer fraction of expected tokens found
    precision = len(overlap) / max(1, len(act))
    recall = len(overlap) / max(1, len(exp))
    # weighted: recall matters more (does PubMed title mention calc-related terms?)
    score = 0.65 * recall + 0.35 * precision
    # boost if substantial absolute overlap
    if len(overlap) >= 3:
        score = min(1.0, score + 0.15)
    if len(overlap) >= 5:
        score = min(1.0, score + 0.1)
    return {
        "score": round(score, 3),
        "overlap": overlap,
        "exp_n": len(exp),
        "act_n": len(act),
        "recall": round(recall, 3),
        "precision": round(precision, 3),
    }


def extract_refs() -> list[dict]:
    refs: list[dict] = []
    files = sorted(
        p for p in CALC_DIR.glob("*.ts") if p.name != "index.ts" and not p.name.startswith("._")
    )
    for fpath in files:
        s = fpath.read_text(encoding="utf-8")
        idx = 0
        while True:
            start = s.find("references:", idx)
            if start < 0:
                break
            before = s[max(0, start - 3500) : start]
            ids = list(re.finditer(r"id:\s*'([^']+)'", before))
            names = list(re.finditer(r"name:\s*'((?:\\'|[^'])*)'", before))
            calc_id = ids[-1].group(1) if ids else "?"
            calc_name = (names[-1].group(1) if names else "?").replace("\\'", "'")
            bracket = s.find("[", start)
            depth = 0
            end = -1
            for i in range(bracket, len(s)):
                if s[i] == "[":
                    depth += 1
                elif s[i] == "]":
                    depth -= 1
                    if depth == 0:
                        end = i
                        break
            if end < 0:
                break
            block = s[bracket + 1 : end]
            d = 0
            o = -1
            for i, ch in enumerate(block):
                if ch == "{":
                    if d == 0:
                        o = i
                    d += 1
                elif ch == "}":
                    d -= 1
                    if d == 0 and o >= 0:
                        body = block[o : i + 1]
                        if "title:" in body or "citation:" in body:

                            def g(pat: str):
                                mm = re.search(pat, body)
                                return mm.group(1) if mm else None

                            title = (g(r"title:\s*'((?:\\'|[^'])*)'") or "").replace("\\'", "'")
                            citation = (g(r"citation:\s*'((?:\\'|[^'])*)'") or "").replace(
                                "\\'", "'"
                            )
                            refs.append(
                                {
                                    "file": fpath.name,
                                    "calcId": calc_id,
                                    "calcName": calc_name,
                                    "title": title,
                                    "citation": citation,
                                    "pmid": g(r"pmid:\s*'([^']*)'"),
                                    "doi": g(r"doi:\s*'([^']*)'"),
                                    "url": g(r"url:\s*'([^']*)'"),
                                    "year": int(g(r"year:\s*(\d{4})"))
                                    if g(r"year:\s*(\d{4})")
                                    else None,
                                    "body_snippet": body[:200],
                                }
                            )
                        o = -1
            idx = end + 1
    return refs


def curl_json(url: str, timeout: int = 40) -> dict:
    r = subprocess.run(
        ["curl", "-sS", "--max-time", str(timeout), url],
        capture_output=True,
        text=True,
    )
    if r.returncode != 0:
        raise RuntimeError(r.stderr or "curl failed")
    if not r.stdout.strip():
        raise RuntimeError("empty response")
    return json.loads(r.stdout)


def esummary_chunk(pmids: list[str]) -> dict[str, dict]:
    params = urllib.parse.urlencode(
        {"db": "pubmed", "id": ",".join(pmids), "retmode": "json"}
    )
    url = f"https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?{params}"
    data = curl_json(url)
    result = data.get("result", {})
    out: dict[str, dict] = {}
    for pid in pmids:
        meta = result.get(pid)
        if isinstance(meta, dict) and meta.get("title") and not meta.get("error"):
            out[pid] = {
                "title": meta.get("title", "").rstrip("."),
                "source": meta.get("source"),
                "pubdate": meta.get("pubdate"),
                "authors": [
                    a.get("name") for a in (meta.get("authors") or [])[:4] if a.get("name")
                ],
                "doi": None,
            }
            for aid in meta.get("articleids") or []:
                if aid.get("idtype") == "doi":
                    out[pid]["doi"] = aid.get("value")
        else:
            out[pid] = {}
    return out


def fetch_all_pmids(pmids: list[str]) -> dict[str, dict]:
    out: dict[str, dict] = {}
    unique = sorted(set(pmids), key=lambda x: int(x) if x.isdigit() else 0)
    batch = 20
    total = len(unique)
    for i in range(0, total, batch):
        chunk = unique[i : i + batch]
        ok = False
        for attempt in range(5):
            try:
                part = esummary_chunk(chunk)
                fails = sum(1 for v in part.values() if not v.get("title"))
                if fails > len(chunk) // 2 and attempt < 4:
                    time.sleep(1.5 * (attempt + 1))
                    continue
                out.update(part)
                ok = True
                break
            except Exception as e:
                print(f"  batch {i//batch+1} attempt {attempt+1}: {e}", file=sys.stderr)
                time.sleep(1.5 * (attempt + 1))
        if not ok:
            for pid in chunk:
                out.setdefault(pid, {})
        done = min(i + batch, total)
        if done % 100 < batch or done == total:
            print(f"  PMIDs fetched: {done}/{total}", file=sys.stderr)
        time.sleep(0.4)

    # retry failures individually
    failed = [pid for pid, meta in out.items() if not meta.get("title")]
    if failed:
        print(f"  Retrying {len(failed)} failed PMIDs…", file=sys.stderr)
        for pid in failed:
            for attempt in range(3):
                try:
                    part = esummary_chunk([pid])
                    if part.get(pid, {}).get("title"):
                        out[pid] = part[pid]
                        break
                except Exception:
                    pass
                time.sleep(0.8 * (attempt + 1))
            time.sleep(0.25)
    return out


def crossref_title(doi: str) -> str | None:
    url = f"https://api.crossref.org/works/{urllib.parse.quote(doi, safe='')}"
    try:
        data = curl_json(url, timeout=25)
        msg = data.get("message", {})
        titles = msg.get("title") or []
        return titles[0] if titles else None
    except Exception:
        return None


def classify(score: float, overlap: list[str], pubmed_title: str | None) -> str:
    if not pubmed_title:
        return "unresolved"
    if score >= 0.28 or len(overlap) >= 2:
        # extra check: very generic overlap only
        if score < 0.18 and len(overlap) < 2:
            return "suspect"
        return "ok"
    if score >= 0.15 or len(overlap) == 1:
        return "suspect"
    return "mismatch"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--skip-doi", action="store_true")
    parser.add_argument("--limit", type=int, default=0, help="Limit refs for smoke test")
    parser.add_argument("--threshold-ok", type=float, default=0.28)
    args = parser.parse_args()

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    print("Extracting references…", file=sys.stderr)
    refs = extract_refs()
    if args.limit:
        refs = refs[: args.limit]
    print(f"  {len(refs)} references", file=sys.stderr)

    pmids = [r["pmid"] for r in refs if r.get("pmid")]
    print(f"Fetching {len(set(pmids))} unique PMIDs from NCBI…", file=sys.stderr)
    pmid_meta = fetch_all_pmids(pmids) if pmids else {}

    # optional DOI check for refs that have DOI but mismatch or no pmid
    doi_titles: dict[str, str | None] = {}
    if not args.skip_doi:
        dois = sorted({r["doi"] for r in refs if r.get("doi")})
        print(f"Fetching {len(dois)} DOIs from Crossref (slow)…", file=sys.stderr)
        for i, doi in enumerate(dois):
            doi_titles[doi] = crossref_title(doi)
            if (i + 1) % 50 == 0:
                print(f"  DOIs: {i+1}/{len(dois)}", file=sys.stderr)
            time.sleep(0.15)

    results = []
    by_status = defaultdict(list)

    for r in refs:
        expected = " ".join(
            filter(None, [r.get("calcName"), r.get("title"), r.get("citation"), r.get("calcId")])
        )
        pmid = r.get("pmid")
        doi = r.get("doi")
        pmeta = pmid_meta.get(pmid, {}) if pmid else {}
        pubmed_title = pmeta.get("title")
        pubmed_doi = pmeta.get("doi")

        pmid_rel = score_relevance(expected, pubmed_title or "")
        status = classify(pmid_rel["score"], pmid_rel["overlap"], pubmed_title)

        # DOI vs PubMed DOI consistency
        doi_mismatch = False
        if pmid and doi and pubmed_doi:
            if doi.lower().strip() != pubmed_doi.lower().strip():
                doi_mismatch = True

        doi_title = doi_titles.get(doi) if doi else None
        doi_rel = score_relevance(expected, doi_title or "") if doi_title else None

        # If PMID looks ok but DOI points elsewhere, flag
        if status == "ok" and doi_mismatch:
            status = "doi_mismatch"
        if status == "ok" and doi_rel and doi_rel["score"] < 0.12 and len(doi_rel["overlap"]) == 0:
            status = "doi_mismatch"

        # URL-only refs: mark for manual review later
        if not pmid and not doi and r.get("url"):
            status = "url_only"
        elif not pmid and doi:
            if doi_rel:
                status = classify(doi_rel["score"], doi_rel["overlap"], doi_title)
            else:
                status = "doi_only_unchecked" if args.skip_doi else "unresolved"

        row = {
            **{k: r[k] for k in ("file", "calcId", "calcName", "title", "citation", "pmid", "doi", "url", "year")},
            "pubmed_title": pubmed_title,
            "pubmed_doi": pubmed_doi,
            "pubmed_source": pmeta.get("source"),
            "pubmed_pubdate": pmeta.get("pubdate"),
            "pubmed_authors": pmeta.get("authors"),
            "pmid_score": pmid_rel["score"] if pubmed_title else None,
            "pmid_overlap": pmid_rel["overlap"] if pubmed_title else [],
            "doi_title": doi_title,
            "doi_score": doi_rel["score"] if doi_rel else None,
            "doi_mismatch_vs_pubmed": doi_mismatch,
            "status": status,
        }
        results.append(row)
        by_status[status].append(row)

    summary = {
        "total_refs": len(results),
        "with_pmid": sum(1 for r in results if r.get("pmid")),
        "with_doi": sum(1 for r in results if r.get("doi")),
        "by_status": {k: len(v) for k, v in sorted(by_status.items(), key=lambda x: -len(x[1]))},
        "mismatches": len(by_status.get("mismatch", [])),
        "suspects": len(by_status.get("suspect", [])),
        "doi_mismatches": len(by_status.get("doi_mismatch", [])),
        "unresolved": len(by_status.get("unresolved", [])),
    }

    (OUT_DIR / "pmid-relevance-full.json").write_text(json.dumps(results, indent=2))
    (OUT_DIR / "pmid-relevance-summary.json").write_text(json.dumps(summary, indent=2))

    # write problem queues
    problems = [
        r
        for r in results
        if r["status"] in ("mismatch", "suspect", "doi_mismatch", "unresolved")
    ]
    problems.sort(key=lambda r: (r["status"], r["file"], r["calcId"]))
    (OUT_DIR / "pmid-relevance-problems.json").write_text(json.dumps(problems, indent=2))

    # group by file for wave assignment
    by_file: dict[str, list] = defaultdict(list)
    for r in problems:
        by_file[r["file"]].append(r)
    (OUT_DIR / "pmid-relevance-by-file.json").write_text(
        json.dumps({k: v for k, v in sorted(by_file.items())}, indent=2)
    )

    # human summary
    lines = [
        "# PMID / DOI relevance audit",
        "",
        f"Total references: **{summary['total_refs']}**",
        f"With PMID: **{summary['with_pmid']}**",
        f"With DOI: **{summary['with_doi']}**",
        "",
        "## Status counts",
        "",
        "| Status | Count |",
        "|--------|------:|",
    ]
    for k, n in summary["by_status"].items():
        lines.append(f"| {k} | {n} |")
    lines += ["", "## Mismatches (clearly wrong PMID)", ""]
    for r in by_status.get("mismatch", [])[:80]:
        lines.append(
            f"- **{r['calcId']}** (`{r['file']}`): claimed *{r['title'][:80]}* → "
            f"PMID {r['pmid']} = `{r.get('pubmed_title') or 'UNRESOLVED'}` "
            f"(score={r.get('pmid_score')})"
        )
    lines += ["", "## DOI mismatches", ""]
    for r in by_status.get("doi_mismatch", [])[:40]:
        lines.append(
            f"- **{r['calcId']}**: DOI `{r['doi']}` vs PubMed DOI `{r.get('pubmed_doi')}` "
            f"| PMID title: {r.get('pubmed_title')}"
        )

    (OUT_DIR / "PMID-RELEVANCE-SUMMARY.md").write_text("\n".join(lines) + "\n")

    print(json.dumps(summary, indent=2))
    print(f"\nWrote reports to {OUT_DIR}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
