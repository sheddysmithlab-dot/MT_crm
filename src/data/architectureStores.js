/**
 * Architecture store catalog — mirrors backend architecture_registry.
 * Used by sync UI / debugging. Keep in sync with
 * backend/app/db/architecture_registry.py
 */
export const MODULE_STORES = {
  system: [
    'meta', 'profiles', 'users', 'conflicts', 'offline_operations',
    'syncQueue', 'system_logs', 'backup_history', 'sync_status',
  ],
  customer: [
    'customers', 'customer_ledger_entries', 'customer_jobs', 'invoices',
    'invoice_items', 'receipts', 'cash_receipts', 'documents',
  ],
  jobs: [
    'jobs', 'inspections', 'estimates', 'estimate_items', 'jobsheets',
    'jobsheet_items', 'challan', 'challans', 'challan_items', 'stock_transactions',
  ],
  vendors: [
    'vendors', 'vendor_ledger_entries', 'vendor_services', 'service_orders',
    'vendor_orders', 'vendor_invoices', 'vendor_invoice_items',
  ],
  labour: ['labour', 'labour_ledger_entries', 'labour_attendance', 'weekly_balances'],
  supplier: ['suppliers', 'supplier_ledger_entries', 'supplier_products'],
  inventory: ['inventory_categories', 'inventory_items', 'stock_movements'],
  accounts: [
    'accounts', 'vouchers', 'gstledger', 'gst_ledger', 'purchase_challans',
    'purchase_challan_items', 'sellchallan', 'sell_challans', 'sell_challan_items',
    'journal_entries', 'journal_lines', 'gst_accounts', 'ledger_views',
    'purchases', 'purchase_items',
  ],
  settings: [
    'settings', 'branches', 'roles', 'permissions', 'templates', 'taxes',
    'hsn_codes', 'audit_logs', 'rate_history', 'rate_list_memory',
    'sequences', 'daily_tasks',
  ],
  financial: ['payments', 'products'],
};

export const ONLINE_ONLY_STORES = [
  'payments', 'cash_receipts', 'vouchers', 'stock_movements',
  'stock_transactions', 'invoices', 'journal_entries', 'journal_lines',
];

export function allArchitectureStores() {
  const out = [];
  for (const stores of Object.values(MODULE_STORES)) {
    for (const s of stores) {
      if (!out.includes(s)) out.push(s);
    }
  }
  return out;
}
