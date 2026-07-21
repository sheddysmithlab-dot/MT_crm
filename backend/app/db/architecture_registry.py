"""
Malwa CRM — Store registry aligned with BACKEND_COMPLETE_ARCHITECTURE.

Source of truth for:
  - IndexedDB store names (Dexie)
  - MySQL table names (crm_*)
  - Legacy desktop file paths (C:/malwa-crm/Data_base/...)
  - Module grouping (11 business modules)

Web Option B: MySQL is primary; browser Dexie is offline cache;
desktop JSON files are migration/import sources only.
"""

from __future__ import annotations

# module -> list of store names (matches architecture doc)
MODULE_STORES: dict[str, list[str]] = {
    "system": [
        "meta",
        "profiles",
        "users",
        "conflicts",
        "offline_operations",
        "syncQueue",
        "system_logs",
        "backup_history",
        "sync_status",
    ],
    "customer": [
        "customers",
        "customer_ledger_entries",
        "customer_jobs",
        "invoices",
        "invoice_items",
        "receipts",
        "cash_receipts",
        "documents",
    ],
    "jobs": [
        "jobs",
        "inspections",
        "estimates",
        "estimate_items",
        "jobsheets",
        "jobsheet_items",
        "challan",
        "challans",
        "challan_items",
        "stock_transactions",
    ],
    "vendors": [
        "vendors",
        "vendor_ledger_entries",
        "vendor_services",
        "service_orders",
        "vendor_orders",
        "vendor_invoices",
        "vendor_invoice_items",
    ],
    "labour": [
        "labour",
        "labour_ledger_entries",
        "labour_attendance",
        "weekly_balances",
    ],
    "supplier": [
        "suppliers",
        "supplier_ledger_entries",
        "supplier_products",
    ],
    "inventory": [
        "inventory_categories",
        "inventory_items",
        "stock_movements",
    ],
    "accounts": [
        "accounts",
        "vouchers",
        "gstledger",
        "gst_ledger",
        "purchase_challans",
        "purchase_challan_items",
        "sellchallan",
        "sell_challans",
        "sell_challan_items",
        "journal_entries",
        "journal_lines",
        "gst_accounts",
        "ledger_views",
        "purchases",
        "purchase_items",
    ],
    "settings": [
        "settings",
        "branches",
        "roles",
        "permissions",
        "templates",
        "taxes",
        "hsn_codes",
        "audit_logs",
        "rate_history",
        "rate_list_memory",
        "sequences",
        "daily_tasks",
    ],
    "financial": [
        "payments",
        "products",
    ],
}

# Legacy desktop JSON paths (for migrate_from_json / desktop import)
# Relative to C:/malwa-crm/Data_base/
STORE_FILE_PATHS: dict[str, str] = {
    "customers": "customer/customers.json",
    "customer_ledger_entries": "customer/customer_ledger_entries.json",
    "customer_jobs": "customer/customer_jobs.json",
    "invoices": "customer/invoices.json",
    "invoice_items": "customer/invoice_items.json",
    "receipts": "customer/receipts.json",
    "cash_receipts": "customer/cash_receipts.json",
    "documents": "customer/documents.json",
    "jobs": "jobs/jobs.json",
    "inspections": "jobs/inspections.json",
    "estimates": "jobs/estimates.json",
    "estimate_items": "jobs/estimate_items.json",
    "jobsheets": "jobs/jobsheets.json",
    "jobsheet_items": "jobs/jobsheet_items.json",
    "challan": "jobs/challan.json",
    "challans": "jobs/challan.json",
    "challan_items": "jobs/challan_items.json",
    "stock_transactions": "jobs/stock_transactions.json",
    "vendors": "vendors/vendors.json",
    "vendor_ledger_entries": "vendors/vendor_ledger_entries.json",
    "vendor_services": "vendors/vendor_services.json",
    "service_orders": "vendors/service_orders.json",
    "vendor_orders": "vendors/vendor_orders.json",
    "vendor_invoices": "vendors/vendor_invoices.json",
    "vendor_invoice_items": "vendors/vendor_invoice_items.json",
    "labour": "labour/labour.json",
    "labour_ledger_entries": "labour/labour_ledger_entries.json",
    "labour_attendance": "labour/labour_attendance.json",
    "weekly_balances": "labour/weekly_balances.json",
    "suppliers": "supplier/suppliers.json",
    "supplier_ledger_entries": "supplier/supplier_ledger_entries.json",
    "supplier_products": "supplier/supplier_products.json",
    "inventory_categories": "inventory/inventory_categories.json",
    "inventory_items": "inventory/inventory_items.json",
    "stock_movements": "inventory/stock_movements.json",
    "accounts": "accounts/accounts.json",
    "vouchers": "accounts/vouchers.json",
    "gstledger": "accounts/gstledger.json",
    "gst_ledger": "accounts/gstledger.json",
    "purchase_challans": "accounts/purchase_challans.json",
    "purchase_challan_items": "accounts/purchase_challan_items.json",
    "sellchallan": "accounts/sellchallan.json",
    "sell_challans": "accounts/sellchallan.json",
    "sell_challan_items": "accounts/sell_challan_items.json",
    "journal_entries": "accounts/journal_entries.json",
    "journal_lines": "accounts/journal_lines.json",
    "gst_accounts": "accounts/gst_accounts.json",
    "ledger_views": "accounts/ledger_views.json",
    "purchases": "accounts/purchases.json",
    "purchase_items": "accounts/purchase_items.json",
    "payments": "financial/payments.json",
    "products": "financial/products.json",
    "users": "settings/User_Management/users.json",
    "profiles": "profiles",  # folder of files
    "roles": "settings/User_Management/roles.json",
    "permissions": "settings/User_Management/user_permissions.json",
    "settings": "settings/settings.json",
    "rate_list_memory": "settings/Rate_List_Memory/rate_list_memory.json",
    "audit_logs": "settings/Legacy/AuditLogs.json",
    "daily_tasks": "DailyTasks.json",
    "syncQueue": "system/syncQueue.json",
    "sync_status": "system/sync_status.json",
    "meta": "meta.json",
}

# Option B: must not accept offline client writes
ONLINE_ONLY_STORES = frozenset(
    {
        "payments",
        "cash_receipts",
        "vouchers",
        "stock_movements",
        "stock_transactions",
        "invoices",
        "journal_entries",
        "journal_lines",
    }
)

# Stores that already have rich typed SQLAlchemy models
TYPED_STORES = frozenset(
    {
        "customers",
        "jobs",
        "vendors",
        "labour",
        "suppliers",
        "inventory_categories",
        "inventory_items",
        "stock_movements",
        "purchases",
        "vouchers",
        "products",
        "users",
        "profiles",
    }
)


def all_store_names() -> list[str]:
    names: list[str] = []
    for stores in MODULE_STORES.values():
        for s in stores:
            if s not in names:
                names.append(s)
    return names


def mysql_table_name(store: str) -> str:
    # Keep crm_ prefix; normalize aliases
    return f"crm_{store}"


def module_for_store(store: str) -> str | None:
    for module, stores in MODULE_STORES.items():
        if store in stores:
            return module
    return None
