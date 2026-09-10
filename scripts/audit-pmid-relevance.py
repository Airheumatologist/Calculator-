#!/usr/bin/env python3
"""
Audit PMID/DOI relevance for calculator evidence references.

1. Load refs with calculator context from the shared inventory
   (scripts/audit-evidence/refs-inventory.json — run `npm run audit:evidence` first)
2. Fetch PubMed titles for all PMIDs via NCBI E-utilities
3. Optionally fetch Crossref titles for DOIs (--with-doi; skipped by default)
4. Score token overlap between PubMed/Crossref title vs calc name + ref title + citation
5. Write heuristic scratch reports (pmid-relevance-*.json,
   PMID-RELEVANCE-SUMMARY.md) — triage input, NOT the authoritative audit;
   see scripts/audit-evidence/README.md

Caching: every successful NCBI/Crossref response is cached as one small JSON
file under scripts/audit-evidence/.cache/ (pmids/<pmid>.json,
dois/<url-encoded-doi>.json), so a warm run skips HTTP entirely for cached
keys. --refresh bypasses the cache (re-fetches and overwrites entries).
Interrupted runs cannot poison the cache: each key is written via a temp file
that is atomically renamed into place, and only successful lookups are cached.

Rate limits: set NCBI_API_KEY in the environment to raise NCBI E-utilities
from 3 to 10 requests/second (URLs are identical when unset). Crossref
requests are parallelised (8 workers) and send a polite User-Agent with a
contact address, as Crossref requests for higher throughput.

Usage:
  python3 scripts/audit-pmid-relevance.py                 # PMID phase only (default)
  python3 scripts/audit-pmid-relevance.py --with-doi      # also check DOIs via Crossref
  python3 scripts/audit-pmid-relevance.py --with-doi --refresh   # ignore cache, re-fetch
  python3 scripts/audit-pmid-relevance.py --limit 50      # smoke test
  python3 scripts/audit-pmid-relevance.py --skip-doi      # same as the default (kept for
                                                          # backwards compatibility)
"""
from __future__ import annotations

import argparse
import contextlib
import json
import os
import re
import subprocess
import sys
import tempfile
import time
import urllib.parse
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent / "lib"))

from inventory import InventoryError, fail, load_refs  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "scripts" / "audit-evidence"
CACHE_DIR = OUT_DIR / ".cache"
PMID_CACHE_DIR = CACHE_DIR / "pmids"
DOI_CACHE_DIR = CACHE_DIR / "dois"

CROSSREF_UA = "MedCalcLive evidence audit/1.0 (mailto:incognitoman1993@gmail.com)"
CROSSREF_WORKERS = 8
CROSSREF_RETRIES = 3

NCBI_API_KEY = os.environ.get("NCBI_API_KEY")

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


def extract_refs(allow_stale: bool = False) -> list[dict]:
    """Load references from the shared inventory (npm run audit:evidence)."""
    return load_refs(allow_stale=allow_stale)


# --- on-disk cache (one small JSON file per PMID / DOI) ----------------------


def cache_read(cache_dir: Path, key: str):
    """Return the cached payload for key, or None on any miss/read error."""
    try:
        return json.loads((cache_dir / f"{key}.json").read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None


def cache_write(cache_dir: Path, key: str, payload) -> None:
    """Atomically write one cache entry (temp file + rename)."""
    cache_dir.mkdir(parents=True, exist_ok=True)
    path = cache_dir / f"{key}.json"
    fd, tmp = tempfile.mkstemp(dir=cache_dir, prefix=".tmp-", suffix=".json")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as fh:
            json.dump(payload, fh, indent=2, sort_keys=True)
            fh.write("\n")
        os.replace(tmp, path)
    except OSError:
        with contextlib.suppress(OSError):
            os.unlink(tmp)


def doi_cache_key(doi: str) -> str:
    return urllib.parse.quote(doi, safe="")


# --- HTTP helpers -------------------------------------------------------------


def curl_json(url: str, timeout: int = 40, headers: dict | None = None) -> dict:
    cmd = ["curl", "-sS", "--max-time", str(timeout)]
    for k, v in (headers or {}).items():
        cmd += ["-H", f"{k}: {v}"]
    cmd.append(url)
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(r.stderr or "curl failed")
    if not r.stdout.strip():
        raise RuntimeError("empty response")
    return json.loads(r.stdout)


def esummary_chunk(pmids: list[str]) -> dict[str, dict]:
    params = {"db": "pubmed", "id": ",".join(pmids), "retmode": "json"}
    if NCBI_API_KEY:
        params["api_key"] = NCBI_API_KEY
    url = f"https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?{urllib.parse.urlencode(params)}"
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


def fetch_all_pmids(pmids: list[str], use_cache: bool = True) -> dict[str, dict]:
    unique = sorted(set(pmids), key=lambda x: int(x) if x.isdigit() else 0)
    out: dict[str, dict] = {}

    if use_cache:
        for pid in unique:
            cached = cache_read(PMID_CACHE_DIR, pid)
            if isinstance(cached, dict) and cached.get("title"):
                out[pid] = cached
    todo = [pid for pid in unique if pid not in out]
    if out:
        print(f"  {len(out)}/{len(unique)} PMIDs from cache", file=sys.stderr)
    if not todo:
        return out

    batch = 20
    total = len(todo)
    for i in range(0, total, batch):
        chunk = todo[i : i + batch]
        ok = False
        for attempt in range(5):
            try:
                part = esummary_chunk(chunk)
                fails = sum(1 for v in part.values() if not v.get("title"))
                if fails > len(chunk) // 2 and attempt < 4:
                    time.sleep(1.5 * (attempt + 1))
                    continue
                out.update(part)
                for pid, meta in part.items():
                    if meta.get("title"):
                        cache_write(PMID_CACHE_DIR, pid, meta)
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
    failed = [pid for pid, meta in out.items() if pid in todo and not meta.get("title")]
    if failed:
        print(f"  Retrying {len(failed)} failed PMIDs…", file=sys.stderr)
        for pid in failed:
            for attempt in range(3):
                try:
                    part = esummary_chunk([pid])
                    if part.get(pid, {}).get("title"):
                        out[pid] = part[pid]
                        cache_write(PMID_CACHE_DIR, pid, part[pid])
                        break
                except Exception:
                    pass
                time.sleep(0.8 * (attempt + 1))
            time.sleep(0.25)
    return out


def crossref_title(doi: str) -> str | None:
    url = f"https://api.crossref.org/works/{urllib.parse.quote(doi, safe='')}"
    for attempt in range(CROSSREF_RETRIES):
        try:
            data = curl_json(url, timeout=25, headers={"User-Agent": CROSSREF_UA})
            msg = data.get("message", {})
            titles = msg.get("title") or []
            return titles[0] if titles else None
        except Exception:
            if attempt == CROSSREF_RETRIES - 1:
                return None
            time.sleep(0.5 * (attempt + 1))
    return None


def fetch_all_dois(dois: list[str], use_cache: bool = True) -> dict[str, str | None]:
    titles: dict[str, str | None] = {}
    todo: list[str] = []
    for doi in dois:
        cached = cache_read(DOI_CACHE_DIR, doi_cache_key(doi)) if use_cache else None
        if isinstance(cached, dict) and isinstance(cached.get("title"), str):
            titles[doi] = cached["title"]
        else:
            todo.append(doi)
    if titles:
        print(f"  {len(titles)}/{len(dois)} DOIs from cache", file=sys.stderr)
    if not todo:
        return titles

    print(f"  fetching {len(todo)} DOIs with {CROSSREF_WORKERS} workers…", file=sys.stderr)
    done = 0
    with ThreadPoolExecutor(max_workers=CROSSREF_WORKERS) as pool:
        futures = {pool.submit(crossref_title, d): d for d in todo}
        for fut in as_completed(futures):
            doi = futures[fut]
            title = fut.result()
            titles[doi] = title
            if title is not None:
                cache_write(DOI_CACHE_DIR, doi_cache_key(doi), {"title": title})
            done += 1
            if done % 100 == 0 or done == len(todo):
                print(f"  DOIs: {done}/{len(todo)}", file=sys.stderr)
    return titles


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
    parser.add_argument(
        "--with-doi",
        action="store_true",
        help="also fetch Crossref titles for DOIs and run the DOI consistency "
        "checks (slower on a cold cache; cached afterwards)",
    )
    parser.add_argument(
        "--skip-doi",
        action="store_true",
        help="skip the Crossref DOI phase (this is the default; kept for "
        "backwards compatibility)",
    )
    parser.add_argument(
        "--refresh",
        action="store_true",
        help="bypass the on-disk cache: re-fetch every PMID/DOI and overwrite "
        "its cache entry",
    )
    parser.add_argument("--limit", type=int, default=0, help="Limit refs for smoke test")
    parser.add_argument("--threshold-ok", type=float, default=0.28)
    parser.add_argument(
        "--allow-stale-inventory",
        action="store_true",
        help="use refs-inventory.json even if the sources changed since it was written",
    )
    args = parser.parse_args()

    if args.with_doi and args.skip_doi:
        parser.error("--with-doi and --skip-doi are contradictory")
    do_doi = args.with_doi

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    print("Loading reference inventory…", file=sys.stderr)
    try:
        refs = extract_refs(allow_stale=args.allow_stale_inventory)
    except InventoryError as exc:
        return fail(exc)
    if args.limit:
        refs = refs[: args.limit]
    print(f"  {len(refs)} references", file=sys.stderr)

    pmids = [r["pmid"] for r in refs if r.get("pmid")]
    print(f"Fetching {len(set(pmids))} unique PMIDs from NCBI…", file=sys.stderr)
    pmid_meta = fetch_all_pmids(pmids, use_cache=not args.refresh) if pmids else {}

    # optional DOI check for refs that have DOI but mismatch or no pmid
    doi_titles: dict[str, str | None] = {}
    if do_doi:
        dois = sorted({r["doi"] for r in refs if r.get("doi")})
        print(f"Fetching {len(dois)} DOIs from Crossref…", file=sys.stderr)
        doi_titles = fetch_all_dois(dois, use_cache=not args.refresh) if dois else {}

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
                status = "doi_only_unchecked" if not do_doi else "unresolved"

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
