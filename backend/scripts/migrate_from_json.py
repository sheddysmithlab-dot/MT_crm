"""
Import CRM JSON exports into MySQL (Phase 9).
Aligned with BACKEND_COMPLETE_ARCHITECTURE store ↔ file map.

Expected layouts:
  1) Full desktop tree:  <root>/customer/customers.json, <root>/jobs/jobs.json, …
  2) Flat files:         <root>/customers.json, <root>/jobs.json, …

Usage:
  cd backend
  python -m scripts.migrate_from_json path/to/Data_base
  python -m scripts.migrate_from_json C:/malwa-crm/Data_base
"""
from __future__ import annotations

import json
import sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.db.session import SessionLocal, engine, Base
from app.db import models  # noqa: F401
from app.db import models_extra  # noqa: F401
from app.db import registry  # noqa: F401
from app.db.registry import RESOURCE_MODELS, STORE_FILE_PATHS
from app.services.resource_service import upsert_row

# stem / folder aliases → resource key
FILE_MAP = {
    "customers": "customers",
    "customer": "customers",
    "customer_ledger_entries": "customer_ledger_entries",
    "customer_jobs": "customer_jobs",
    "invoices": "invoices",
    "invoice_items": "invoice_items",
    "receipts": "receipts",
    "cash_receipts": "cash_receipts",
    "documents": "documents",
    "jobs": "jobs",
    "inspections": "inspections",
    "estimates": "estimates",
    "estimate_items": "estimate_items",
    "jobsheets": "jobsheets",
    "jobsheet_items": "jobsheet_items",
    "challan": "challan",
    "challans": "challan",
    "challan_items": "challan_items",
    "stock_transactions": "stock_transactions",
    "vendors": "vendors",
    "vendor": "vendors",
    "vendor_ledger_entries": "vendor_ledger_entries",
    "vendor_services": "vendor_services",
    "service_orders": "service_orders",
    "vendor_orders": "vendor_orders",
    "vendor_invoices": "vendor_invoices",
    "vendor_invoice_items": "vendor_invoice_items",
    "labour": "labour",
    "labour_ledger_entries": "labour_ledger_entries",
    "labour_attendance": "labour_attendance",
    "weekly_balances": "weekly_balances",
    "suppliers": "suppliers",
    "supplier": "suppliers",
    "supplier_ledger_entries": "supplier_ledger_entries",
    "supplier_products": "supplier_products",
    "inventory_categories": "inventory_categories",
    "categories": "inventory_categories",
    "inventory_items": "inventory_items",
    "items": "inventory_items",
    "stock_movements": "stock_movements",
    "accounts": "accounts",
    "vouchers": "vouchers",
    "gstledger": "gstledger",
    "gst_ledger": "gstledger",
    "purchase_challans": "purchase_challans",
    "purchase_challan_items": "purchase_challan_items",
    "sellchallan": "sellchallan",
    "sell_challans": "sellchallan",
    "sell_challan_items": "sell_challan_items",
    "journal_entries": "journal_entries",
    "journal_lines": "journal_lines",
    "gst_accounts": "gst_accounts",
    "ledger_views": "ledger_views",
    "purchases": "purchases",
    "purchase_items": "purchase_items",
    "payments": "payments",
    "products": "products",
    "users": "users",
    "profiles": "profiles",
    "roles": "roles",
    "permissions": "permissions",
    "settings": "settings",
    "templates": "templates",
    "taxes": "taxes",
    "hsn_codes": "hsn_codes",
    "audit_logs": "audit_logs",
    "rate_history": "rate_history",
    "rate_list_memory": "rate_list_memory",
    "sequences": "sequences",
    "daily_tasks": "daily_tasks",
    "branches": "branches",
    "meta": "meta",
}


def _load_json(path: Path):
    with path.open("r", encoding="utf-8") as f:
        data = json.load(f)
    if isinstance(data, dict):
        if "data" in data and isinstance(data["data"], list):
            return data["data"]
        if all(isinstance(v, dict) for v in data.values()):
            return list(data.values())
        return [data]
    if isinstance(data, list):
        return data
    return []


def discover_from_architecture_paths(root: Path) -> list[tuple[str, Path]]:
    """Prefer exact architecture relative paths when present."""
    found: list[tuple[str, Path]] = []
    seen: set[str] = set()
    for store, rel in STORE_FILE_PATHS.items():
        if store not in RESOURCE_MODELS:
            continue
        path = root / rel
        if path.is_file():
            found.append((store, path))
            seen.add(store)
    return found


def discover_files(root: Path) -> list[tuple[str, Path]]:
    found = discover_from_architecture_paths(root)
    seen = {s for s, _ in found}
    for path in root.rglob("*.json"):
        stem = path.stem.lower()
        parent = path.parent.name.lower()
        resource = FILE_MAP.get(stem) or FILE_MAP.get(parent)
        if resource and resource in RESOURCE_MODELS and resource not in seen:
            found.append((resource, path))
            seen.add(resource)
    return found


def main():
    if len(sys.argv) < 2:
        print("Usage: python -m scripts.migrate_from_json <Data_base_folder>")
        print("Example: python -m scripts.migrate_from_json C:/malwa-crm/Data_base")
        sys.exit(1)

    root = Path(sys.argv[1]).resolve()
    if not root.exists():
        print(f"Folder not found: {root}")
        sys.exit(1)

    Base.metadata.create_all(bind=engine)
    files = discover_files(root)
    if not files:
        print("No matching JSON files found (check architecture paths).")
        sys.exit(1)

    print(f"Found {len(files)} store files under {root}")
    db = SessionLocal()
    stats: dict[str, dict[str, int]] = {}
    try:
        for resource, path in files:
            rows = _load_json(path)
            bucket = stats.setdefault(resource, {"ok": 0, "skip": 0, "err": 0})
            print(f"→ {resource}: {len(rows)} from {path}")
            for row in rows:
                if not isinstance(row, dict) or not row.get("id"):
                    bucket["err"] += 1
                    continue
                try:
                    updated = row.get("updated_at")
                    if isinstance(updated, str):
                        try:
                            updated_dt = datetime.fromisoformat(updated.replace("Z", ""))
                        except ValueError:
                            updated_dt = datetime.utcnow()
                    else:
                        updated_dt = datetime.utcnow()
                    outcome = upsert_row(db, resource, row["id"], row, updated_dt)
                    if outcome == "skipped":
                        bucket["skip"] += 1
                    else:
                        bucket["ok"] += 1
                except Exception as exc:  # noqa: BLE001
                    db.rollback()
                    bucket["err"] += 1
                    print(f"  ! {resource}/{row.get('id')}: {exc}")
        print("\nDone (architecture-aligned migrate):")
        for resource, counts in sorted(stats.items()):
            print(f"  {resource}: {counts}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
