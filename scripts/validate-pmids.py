#!/usr/bin/env python3
"""
Validate all PMID fields in calculator data against NCBI PubMed.

References come from scripts/audit-evidence/refs-inventory.json, produced by
`npm run audit:evidence`. This script never parses the TypeScript sources
itself, so its counts always match the evidence audit.

Usage:
  python3 scripts/validate-pmids.py
  python3 scripts/validate-pmids.py --strict
  python3 scripts/validate-pmids.py --offline   # counts only, no network

Exit 0 if all PMIDs resolve; 1 if any are missing/invalid; 2 if the inventory
is missing or stale.
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
import time
import urllib.parse
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent / "lib"))

from inventory import (  # noqa: E402
    INVENTORY,
    ROOT,
    InventoryError,
    fail,
    load_inventory,
)


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
    parser.add_argument(
        "--offline",
        action="store_true",
        help="report inventory counts only; do not contact NCBI",
    )
    parser.add_argument(
        "--allow-stale-inventory",
        action="store_true",
        help="use refs-inventory.json even if the sources changed since it was written",
    )
    args = parser.parse_args()

    try:
        inventory = load_inventory(allow_stale=args.allow_stale_inventory)
    except InventoryError as exc:
        return fail(exc)

    refs = inventory["references"]
    with_pmid = [r for r in refs if r["pmid"]]
    without_link = [r for r in refs if not (r["pmid"] or r["doi"] or r["url"])]

    print(f"Inventory: {INVENTORY.relative_to(ROOT)} (generated {inventory['generatedAt']})")
    print(f"References scanned: {len(refs)}")
    print(f"With PMID: {len(with_pmid)}")
    print(f"Unique PMIDs: {len({r['pmid'] for r in with_pmid})}")
    print(f"With DOI: {sum(1 for r in refs if r['doi'])}")
    print(f"With URL: {sum(1 for r in refs if r['url'])}")
    print(f"Without any active link: {len(without_link)}")

    pmids = [r["pmid"] for r in with_pmid if r["pmid"]]

    if args.offline:
        print("\n--offline: skipping NCBI resolution check.")
        if args.strict and without_link:
            print(f"\nSTRICT: {len(without_link)} refs lack pmid/doi/url")
            for r in without_link[:20]:
                print(f"  {r['file']}: {r['citation'][:70]}")
            return 1
        return 0

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
