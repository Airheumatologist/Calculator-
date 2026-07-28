#!/usr/bin/env python3
"""
Validate all PMID fields in calculator data against NCBI PubMed.

Usage:
  python3 scripts/validate-pmids.py
  python3 scripts/validate-pmids.py --strict

Exit 0 if all PMIDs resolve; 1 if any are missing/invalid.
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

REF_RE = re.compile(
    r"\{\s*title:\s*'(?:\\'|[^'])*'\s*,\s*citation:\s*'(?:\\'|[^'])*'[^}]*\}"
)
PMID_RE = re.compile(r"pmid:\s*'(\d+)'")
DOI_RE = re.compile(r"doi:\s*'([^']+)'")
URL_RE = re.compile(r"url:\s*'([^']+)'")


def extract_refs() -> list[dict]:
    refs: list[dict] = []
    files = sorted(
        p for p in CALC_DIR.glob("*.ts") if not p.name.startswith("._") and p.name != "index.ts"
    )
    for fpath in files:
        text = fpath.read_text(encoding="utf-8")
        for m in REF_RE.finditer(text):
            obj = m.group(0)
            pmid = PMID_RE.search(obj)
            doi = DOI_RE.search(obj)
            url = URL_RE.search(obj)
            title_m = re.search(r"title:\s*'((?:\\'|[^'])*)'", obj)
            cit_m = re.search(r"citation:\s*'((?:\\'|[^'])*)'", obj)
            refs.append(
                {
                    "file": fpath.name,
                    "title": title_m.group(1) if title_m else "",
                    "citation": cit_m.group(1) if cit_m else "",
                    "pmid": pmid.group(1) if pmid else None,
                    "doi": doi.group(1) if doi else None,
                    "url": url.group(1) if url else None,
                }
            )
    return refs


def curl_json(url: str) -> dict:
    r = subprocess.run(
        ["curl", "-sS", "--max-time", "40", url],
        capture_output=True,
        text=True,
    )
    if r.returncode != 0:
        raise RuntimeError(r.stderr or "curl failed")
    if not r.stdout.strip():
        raise RuntimeError("empty response")
    return json.loads(r.stdout)


def esummary_chunk(pmids: list[str]) -> dict[str, str | None]:
    params = urllib.parse.urlencode({"db": "pubmed", "id": ",".join(pmids), "retmode": "json"})
    url = f"https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?{params}"
    data = curl_json(url)
    result = data.get("result", {})
    out: dict[str, str | None] = {}
    for pid in pmids:
        meta = result.get(pid)
        if isinstance(meta, dict) and meta.get("title") and not meta.get("error"):
            out[pid] = meta["title"]
        else:
            out[pid] = None
    return out


def validate_pmids(pmids: list[str]) -> dict[str, str | None]:
    out: dict[str, str | None] = {}
    unique = sorted(set(pmids), key=lambda x: int(x))
    batch = 15
    for i in range(0, len(unique), batch):
        chunk = unique[i : i + batch]
        for attempt in range(4):
            try:
                part = esummary_chunk(chunk)
                # if too many failures in chunk, retry whole chunk
                fails = sum(1 for v in part.values() if not v)
                if fails > len(chunk) // 2 and attempt < 3:
                    time.sleep(1.2 * (attempt + 1))
                    continue
                out.update(part)
                break
            except Exception:
                time.sleep(1.2 * (attempt + 1))
                if attempt == 3:
                    for pid in chunk:
                        out.setdefault(pid, None)
        time.sleep(0.45)

    # Retry individual failures
    failed = [pid for pid, title in out.items() if not title]
    for pid in failed:
        ok = False
        for attempt in range(3):
            try:
                part = esummary_chunk([pid])
                if part.get(pid):
                    out[pid] = part[pid]
                    ok = True
                    break
            except Exception:
                pass
            time.sleep(0.8 * (attempt + 1))
        if not ok:
            out[pid] = None
        time.sleep(0.25)
    return out


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--strict", action="store_true")
    args = parser.parse_args()

    refs = extract_refs()
    with_pmid = [r for r in refs if r["pmid"]]
    without_link = [r for r in refs if not (r["pmid"] or r["doi"] or r["url"])]

    print(f"References scanned: {len(refs)}")
    print(f"With PMID: {len(with_pmid)}")
    print(f"With DOI: {sum(1 for r in refs if r['doi'])}")
    print(f"With URL: {sum(1 for r in refs if r['url'])}")
    print(f"Without any active link: {len(without_link)}")

    pmids = [r["pmid"] for r in with_pmid if r["pmid"]]
    print(f"\nValidating {len(set(pmids))} unique PMIDs via NCBI…")
    status = validate_pmids(pmids)

    invalid = sorted(pid for pid, title in status.items() if not title)
    if invalid:
        print(f"\nINVALID / unresolved PMIDs ({len(invalid)}):")
        for pid in invalid:
            uses = [r for r in with_pmid if r["pmid"] == pid]
            print(f"  {pid}")
            for u in uses[:2]:
                print(f"    - {u['file']}: {u['citation'][:70]}")
    else:
        print("All PMIDs resolve to PubMed records.")

    if args.strict and without_link:
        print(f"\nSTRICT: {len(without_link)} refs lack pmid/doi/url")
        for r in without_link[:20]:
            print(f"  {r['file']}: {r['citation'][:70]}")

    failed = bool(invalid) or (args.strict and bool(without_link))
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
