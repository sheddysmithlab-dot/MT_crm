"""
Auto-generate flexible SQLAlchemy models for every architecture store
that does not yet have a typed model.

Each flexible table:
  id VARCHAR(36) PK
  status VARCHAR(64) NULL
  data_json JSON  — full record body (architecture-compatible)
  created_at / updated_at / deleted_at / synced_from
"""
from __future__ import annotations

from typing import Optional

from sqlalchemy import String, DateTime, JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base
from app.db.models import TimestampMixin
from app.db.architecture_registry import (
    all_store_names,
    mysql_table_name,
    TYPED_STORES,
    ONLINE_ONLY_STORES,
    MODULE_STORES,
    STORE_FILE_PATHS,
)
from app.db.models import Customer, User, Profile, ONLINE_ONLY_TABLES as _BASE_ONLINE_ONLY
from app.db.models_extra import (
    Job,
    Vendor,
    Labour,
    Supplier,
    InventoryCategory,
    InventoryItem,
    StockMovement,
    Purchase,
    Voucher,
    Product,
)

# Start with typed models
RESOURCE_MODELS: dict[str, type] = {
    "customers": Customer,
    "jobs": Job,
    "vendors": Vendor,
    "labour": Labour,
    "suppliers": Supplier,
    "inventory_categories": InventoryCategory,
    "inventory_items": InventoryItem,
    "stock_movements": StockMovement,
    "purchases": Purchase,
    "vouchers": Voucher,
    "products": Product,
    "users": User,
    "profiles": Profile,
}

SEARCH_FIELDS: dict[str, list[str]] = {
    "customers": ["name", "phone", "email", "company"],
    "jobs": ["job_no", "vehicle_no", "customer_name", "party_name", "status"],
    "vendors": ["name", "code", "phone", "company"],
    "labour": ["name", "code", "phone"],
    "suppliers": ["name", "code", "phone", "company"],
    "inventory_categories": ["name"],
    "inventory_items": ["name", "code", "material_name"],
    "stock_movements": ["item_id", "movement_type", "reference_id"],
    "purchases": ["invoice_no", "supplier_name", "status"],
    "vouchers": ["voucher_no", "voucher_type", "payee_name"],
    "products": ["name", "code", "category"],
    "inspections": ["status", "vehicle_no", "party_name"],
    "estimates": ["estimate_no", "status", "vehicle_no"],
    "jobsheets": ["status"],
    "invoices": ["invoice_no", "status"],
    "accounts": ["code", "name", "type"],
    "daily_tasks": ["status"],
}


def _make_flexible(store: str) -> type:
    table = mysql_table_name(store)
    class_name = "".join(p.title() for p in store.replace("-", "_").split("_")) + "Doc"

    attrs = {
        "__tablename__": table,
        "__table_args__": {"extend_existing": True},
        "id": mapped_column(String(36), primary_key=True),
        "status": mapped_column(String(64), nullable=True, index=True),
        "data_json": mapped_column(JSON, nullable=True),
        "__module__": __name__,
    }
    # TimestampMixin fields via multiple inheritance
    model = type(class_name, (Base, TimestampMixin), attrs)
    return model


# Aliases used in Dexie / syncTableDefs (same physical table)
ALIAS_MAP = {
    "challans": "challan",
    "gst_ledger": "gstledger",
    "sell_challans": "sellchallan",
}

# Register every architecture store
for _store in all_store_names():
    if _store in RESOURCE_MODELS:
        continue
    if _store in TYPED_STORES:
        continue
    if _store in ALIAS_MAP:
        continue
    RESOURCE_MODELS[_store] = _make_flexible(_store)
    SEARCH_FIELDS.setdefault(_store, ["status"])

for alias, target in ALIAS_MAP.items():
    if target in RESOURCE_MODELS:
        RESOURCE_MODELS[alias] = RESOURCE_MODELS[target]
    elif alias not in RESOURCE_MODELS:
        # create target then alias
        RESOURCE_MODELS[target] = _make_flexible(target)
        RESOURCE_MODELS[alias] = RESOURCE_MODELS[target]

SYNCABLE_TABLES = frozenset(RESOURCE_MODELS.keys())

# Merge online-only from architecture + models
ONLINE_ONLY_TABLES = frozenset(set(_BASE_ONLINE_ONLY) | set(ONLINE_ONLY_STORES))

__all__ = [
    "RESOURCE_MODELS",
    "SEARCH_FIELDS",
    "SYNCABLE_TABLES",
    "ONLINE_ONLY_TABLES",
    "MODULE_STORES",
    "STORE_FILE_PATHS",
    "ALIAS_MAP",
]
