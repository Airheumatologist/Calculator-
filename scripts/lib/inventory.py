"""Shared loader for the evidence reference inventory.

The inventory is produced by ``npm run audit:evidence`` from
``scripts/lib/reference-parser.mjs``. Python audit tools consume it instead of
re-parsing the TypeScript sources, so every tool reports the same counts.
"""
from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CALC_DIR = ROOT / "src" / "data" / "calculators"
INVENTORY = ROOT / "scripts" / "audit-evidence" / "refs-inventory.json"
REGEN_CMD = "npm run audit:evidence"


class InventoryError(RuntimeError):
    pass


def _source_hash() -> str:
    h = hashlib.sha256()
    files = sorted(
        p
        for p in CALC_DIR.glob("*.ts")
        if p.name != "index.ts" and not p.name.startswith("._")
    )
    for p in files:
        h.update(p.name.encode("utf-8"))
        h.update(b"\0")
        h.update(p.read_bytes())
        h.update(b"\0")
    return h.hexdigest()


def load_inventory(allow_stale: bool = False) -> dict:
    """Return the inventory dict, or raise InventoryError with a fix hint."""
    if not INVENTORY.exists():
        raise InventoryError(
            f"reference inventory not found at {INVENTORY.relative_to(ROOT)}.\n"
            f"Run `{REGEN_CMD}` first — it is the single source of truth for the\n"
            "reference inventory and this tool will not re-parse the TypeScript "
            "sources itself."
        )
    try:
        data = json.loads(INVENTORY.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise InventoryError(
            f"reference inventory at {INVENTORY.relative_to(ROOT)} is not valid JSON "
            f"({exc}).\nRegenerate it with `{REGEN_CMD}`."
        ) from exc

    if data.get("schema") != "medcalc-refs-inventory/1":
        raise InventoryError(
            f"unexpected inventory schema {data.get('schema')!r}.\n"
            f"Regenerate it with `{REGEN_CMD}`."
        )
    if not data.get("references"):
        raise InventoryError(
            f"reference inventory is empty. Regenerate it with `{REGEN_CMD}`."
        )

    if data.get("sourceHash") != _source_hash() and not allow_stale:
        raise InventoryError(
            "reference inventory is stale: src/data/calculators has changed since "
            f"it was generated ({data.get('generatedAt')}).\n"
            f"Regenerate it with `{REGEN_CMD}` (or pass --allow-stale-inventory to "
            "audit what is on disk)."
        )
    return data


def load_refs(allow_stale: bool = False) -> list[dict]:
    return load_inventory(allow_stale=allow_stale)["references"]


def fail(exc: InventoryError) -> int:
    print(f"ERROR: {exc}", file=sys.stderr)
    return 2
