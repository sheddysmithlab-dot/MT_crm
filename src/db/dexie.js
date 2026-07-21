import Dexie from 'dexie';

// Database name and version must match the existing IndexedDB setup
const DB_NAME = 'malwa_crm_db';
const DB_VERSION = 17; // v17: Added purchase_challan_items and sell_challan_items stores

/**
 * Dexie wrapper for malwa_crm_db
 * 
 * This replaces the raw IndexedDB implementation while maintaining:
 * - Same database name: 'malwa_crm_db'
 * - Same store names and keyPaths
 * - Same indexes
 * - Backward compatibility with existing data
 */
class MalwaCRMDatabase extends Dexie {
  constructor() {
    super(DB_NAME);
    
    // Define the schema for version 17
    // Syntax: 'keyPath, index1, index2, ...'
    // & = unique index
    // * = multi-entry index
    // [a+b] = compound index
    
    this.version(17).stores({
      // Customer Module - Enhanced with compound indexes for better query performance
      customers: 'id, phone, email, name, type, company, [type+status], created_at, updated_at',
      customer_ledger_entries: 'id, customer_id, entry_date, [customer_id+entry_date], created_at',
      customer_jobs: 'id, customer_id, &job_no, status, [customer_id+status], created_at',
      
      // Invoicing - Enhanced with date and status indexes
      invoices: 'id, customer_id, &invoice_no, date, status, [customer_id+status], created_at',
      invoice_items: 'id, invoiceId, productId, [invoiceId+productId]',
      receipts: 'id, customer_id, date, amount, created_at',
      cash_receipts: 'id, customer_id, date, amount, created_at',
      
      // Vendor Module - Enhanced with status tracking
      vendors: 'id, &code, name, serviceType, status, created_at, updated_at',
      vendor_ledger_entries: 'id, vendor_id, entry_date, [vendor_id+entry_date], created_at',
      vendor_services: 'id, vendor_id, service_name',
      vendor_orders: 'id, vendorId, jobId, date, status, [vendorId+status], [jobId+status], created_at',
      vendor_invoices: 'id, vendorId, jobId, serviceOrderId, date, status, [vendorId+status], created_at',
      vendor_invoice_items: 'id, vendorInvoiceId, [vendorInvoiceId+productId]',
      service_orders: 'id, vendor_id, job_id, status, created_at',
      
      // Labour Module - Enhanced with attendance tracking
      labour: 'id, &code, technicianId, employeeId, vendorId, status, created_at, updated_at',
      labour_ledger_entries: 'id, labour_id, entry_date, [labour_id+entry_date], created_at',
      labour_attendance: 'id, labour_id, date, status, [labour_id+date], [labour_id+status], created_at',
      weekly_balances: 'id, labour_id, week_start, week_end, [labour_id+week_start]',
      
      // Supplier Module - Enhanced with GST tracking
      suppliers: 'id, &code, name, gstin, status, created_at, updated_at',
      supplier_ledger_entries: 'id, supplier_id, entry_date, [supplier_id+entry_date], created_at',
      supplier_products: 'id, supplier_id, product_name, [supplier_id+product_name]',
      
      // Inventory Module - Enhanced with category and stock tracking
      inventory_categories: 'id, name, created_at',
      inventory_items: 'id, &code, category_id, name, current_stock, [category_id+name], created_at, updated_at',
      stock_movements: 'id, item_id, movement_type, quantity, date, [item_id+date], created_at',
      stock_transactions: 'id, productId, referenceType, referenceId, createdAt, [productId+referenceType], [referenceId+referenceType]',
      
      // Accounts Module - Enhanced with account hierarchy and date ranges
      accounts: 'id, &code, type, parentId, name, [type+parentId], created_at',
      purchases: 'id, supplierId, supplier_id, vendorId, date, status, [supplierId+status], [date+status], created_at',
      purchase_items: 'id, purchaseId, productId, [purchaseId+productId]',
      vouchers: 'id, voucher_type, date, payee_id, payee_type, [voucher_type+date], [payee_id+payee_type], created_at',
      gst_ledger: 'id, invoice_id, gst_type, date, [gst_type+date]',
      gstledger: 'id, invoice_id, gst_type, date, [gst_type+date]',
      gst_accounts: 'id, account_type, tax_rate, created_at',
      ledger_views: 'id, account_id, view_type, created_at',
      
      // Challan Stores - Enhanced with date and status tracking
      purchase_challans: 'id, purchaseId, supplierId, date, status, [supplierId+date], created_at',
      purchase_challan_items: 'id, challan_id, product_id, [challan_id+product_id]',
      sell_challans: 'id, customer_id, date, status, [customer_id+date], created_at',
      sellchallan: 'id, customer_id, date, status, [customer_id+date], created_at',
      sell_challan_items: 'id, challan_id, product_id, [challan_id+product_id]',
      challans: 'id, jobId, customerId, date, status, [jobId+status], [customerId+date], created_at',
      challan: 'id, jobId, customerId, date, status, [jobId+status], [customerId+date], created_at',
      challan_items: 'id, challanId, productId, quantity, [challanId+productId]',
      
      // Job Module - Enhanced with workflow status tracking
      jobs: 'id, status, customerId, scheduledStart, createdAt, [status+scheduledStart], [customerId+status], updated_at',
      inspections: 'id, jobId, createdAt, status, [jobId+status], inspector_id',
      estimates: 'id, customerId, jobId, date, status, [customerId+status], [jobId+status], created_at',
      estimate_items: 'id, estimateId, productId, quantity, [estimateId+productId]',
      jobsheets: 'id, jobId, technicianId, date, status, [jobId+status], [technicianId+date], created_at',
      jobsheet_items: 'id, jobsheetId, productId, isIssued, [jobsheetId+productId], [jobsheetId+isIssued]',
      
      // Journal & Products - Enhanced with financial tracking
      journal_entries: 'id, sourceType, sourceId, date, [sourceType+date], [sourceId+sourceType], created_at',
      journal_lines: 'id, journalEntryId, accountId, amount, [journalEntryId+accountId]',
      products: 'id, name, code, category, price, stock, created_at, updated_at',
      payments: 'id, invoiceId, payeeId, payeeType, vendorId, customerId, date, amount, [payeeType+date], [customerId+date], [vendorId+date], created_at',
      
      // Settings Module - Enhanced with audit tracking
      templates: 'id, name, type, createdAt, updated_at, [type+name]',
      roles: 'id, &name, createdAt, updated_at, status',
      permissions: 'id, roleId, resource, action, [roleId+resource], [resource+action]',
      taxes: 'id, &code, type, rate, [type+rate], created_at',
      hsn_codes: 'id, &hsn, description, tax_rate, created_at',
      audit_logs: 'id, userId, actionType, createdAt, entityType, entityId, [userId+actionType], [entityType+entityId], [userId+createdAt]',
      rate_history: 'id, product_id, rate, effective_date, [product_id+effective_date]',
      rate_list_memory: 'id, list_name, created_at, updated_at',
      
      // Documents & User Management - Enhanced with file tracking
      documents: 'id, customerId, entityType, entityId, uploadedAt, fileType, [entityType+entityId], [customerId+uploadedAt]',
      branches: 'id, name, code, status, created_at',
      profiles: 'id, user_id, updated_at',
      users: 'id, &email, username, role, status, created_at, [role+status]',
      
      // System & Sync - Enhanced with priority and status tracking
      sequences: 'key', // Special: key-value store with 'key' as keyPath
      daily_tasks: 'id, assigned_to, due_date, status, priority, [assigned_to+status], [due_date+status], created_at',
      offline_operations: 'id, status, createdAt, priority, operation_type, [status+priority], [operation_type+status]',
      meta: 'id, key, updated_at',
      conflicts: 'id, store_name, record_id, detected_at, resolved, [store_name+resolved]',
      syncQueue: 'id, store_name, operation, status, created_at, [status+created_at], [store_name+status]',
      job_operations_queue: 'id, job_id, operation, status, priority, created_at, [job_id+status], [status+priority]',
      user_page_visibility: 'id, userId, created_at, updated_at',
      system_logs: 'id, level, message, timestamp, category, [level+timestamp], [category+timestamp]',
      backup_history: 'id, backup_type, created_at, status, file_size, [backup_type+created_at]',
      sync_status: 'id, store_name, last_sync, status, [store_name+status]'
    });
    
    // Version upgrade hook - maintains data during migration
    this.version(17).upgrade(tx => {
      console.log('Dexie migration: Upgrading to version 17');
      // All stores and indexes are automatically created by Dexie
      // No manual data migration needed as schema is identical
      return tx.table('meta').toCollection().modify(record => {
        record.dexie_migrated = true;
        record.dexie_migration_date = new Date().toISOString();
      }).catch(() => {
        // Meta table might be empty, that's okay
        console.log('Meta table empty or not found during migration');
      });
    });
    
    // Define table references for TypeScript-like autocomplete
    /** @type {Dexie.Table} */
    this.customers;
    /** @type {Dexie.Table} */
    this.customer_ledger_entries;
    /** @type {Dexie.Table} */
    this.customer_jobs;
    /** @type {Dexie.Table} */
    this.invoices;
    /** @type {Dexie.Table} */
    this.invoice_items;
    /** @type {Dexie.Table} */
    this.receipts;
    /** @type {Dexie.Table} */
    this.cash_receipts;
    /** @type {Dexie.Table} */
    this.vendors;
    /** @type {Dexie.Table} */
    this.vendor_ledger_entries;
    /** @type {Dexie.Table} */
    this.vendor_services;
    /** @type {Dexie.Table} */
    this.vendor_orders;
    /** @type {Dexie.Table} */
    this.vendor_invoices;
    /** @type {Dexie.Table} */
    this.vendor_invoice_items;
    /** @type {Dexie.Table} */
    this.service_orders;
    /** @type {Dexie.Table} */
    this.labour;
    /** @type {Dexie.Table} */
    this.labour_ledger_entries;
    /** @type {Dexie.Table} */
    this.labour_attendance;
    /** @type {Dexie.Table} */
    this.weekly_balances;
    /** @type {Dexie.Table} */
    this.suppliers;
    /** @type {Dexie.Table} */
    this.supplier_ledger_entries;
    /** @type {Dexie.Table} */
    this.supplier_products;
    /** @type {Dexie.Table} */
    this.inventory_categories;
    /** @type {Dexie.Table} */
    this.inventory_items;
    /** @type {Dexie.Table} */
    this.stock_movements;
    /** @type {Dexie.Table} */
    this.stock_transactions;
    /** @type {Dexie.Table} */
    this.accounts;
    /** @type {Dexie.Table} */
    this.purchases;
    /** @type {Dexie.Table} */
    this.purchase_items;
    /** @type {Dexie.Table} */
    this.vouchers;
    /** @type {Dexie.Table} */
    this.gst_ledger;
    /** @type {Dexie.Table} */
    this.gstledger;
    /** @type {Dexie.Table} */
    this.gst_accounts;
    /** @type {Dexie.Table} */
    this.ledger_views;
    /** @type {Dexie.Table} */
    this.purchase_challans;
    /** @type {Dexie.Table} */
    this.purchase_challan_items;
    /** @type {Dexie.Table} */
    this.sell_challans;
    /** @type {Dexie.Table} */
    this.sellchallan;
    /** @type {Dexie.Table} */
    this.sell_challan_items;
    /** @type {Dexie.Table} */
    this.challans;
    /** @type {Dexie.Table} */
    this.challan;
    /** @type {Dexie.Table} */
    this.challan_items;
    /** @type {Dexie.Table} */
    this.jobs;
    /** @type {Dexie.Table} */
    this.inspections;
    /** @type {Dexie.Table} */
    this.estimates;
    /** @type {Dexie.Table} */
    this.estimate_items;
    /** @type {Dexie.Table} */
    this.jobsheets;
    /** @type {Dexie.Table} */
    this.jobsheet_items;
    /** @type {Dexie.Table} */
    this.journal_entries;
    /** @type {Dexie.Table} */
    this.journal_lines;
    /** @type {Dexie.Table} */
    this.products;
    /** @type {Dexie.Table} */
    this.payments;
    /** @type {Dexie.Table} */
    this.templates;
    /** @type {Dexie.Table} */
    this.roles;
    /** @type {Dexie.Table} */
    this.permissions;
    /** @type {Dexie.Table} */
    this.taxes;
    /** @type {Dexie.Table} */
    this.hsn_codes;
    /** @type {Dexie.Table} */
    this.audit_logs;
    /** @type {Dexie.Table} */
    this.rate_history;
    /** @type {Dexie.Table} */
    this.rate_list_memory;
    /** @type {Dexie.Table} */
    this.documents;
    /** @type {Dexie.Table} */
    this.branches;
    /** @type {Dexie.Table} */
    this.profiles;
    /** @type {Dexie.Table} */
    this.users;
    /** @type {Dexie.Table} */
    this.sequences;
    /** @type {Dexie.Table} */
    this.daily_tasks;
    /** @type {Dexie.Table} */
    this.offline_operations;
    /** @type {Dexie.Table} */
    this.meta;
    /** @type {Dexie.Table} */
    this.conflicts;
    /** @type {Dexie.Table} */
    this.syncQueue;
    /** @type {Dexie.Table} */
    this.job_operations_queue;
    /** @type {Dexie.Table} */
    this.user_page_visibility;
    /** @type {Dexie.Table} */
    this.system_logs;
    /** @type {Dexie.Table} */
    this.backup_history;
    /** @type {Dexie.Table} */
    this.sync_status;
  }
}

// Create and export the database instance
export const db = new MalwaCRMDatabase();

// ── Remote-write context ────────────────────────────────────────────────────
// When syncService pulls records from MySQL into Dexie, set this flag so
// hooks DON'T (a) overwrite the MySQL updated_at with Date.now() and
// (b) re-queue the pulled rows as outgoing changes. Both would cause ping-pong.
let __remoteWriteDepth = 0;
export const isRemoteWrite = () => __remoteWriteDepth > 0;
export const withRemoteWrite = async (fn) => {
  __remoteWriteDepth++;
  try { return await fn(); }
  finally { __remoteWriteDepth--; }
};

// Dexie Hooks for automatic data management and sync triggers
// These hooks provide lifecycle events for CRUD operations

/**
 * Register global hooks for all tables
 * Useful for sync triggers, audit logging, and timestamps
 */
db.on('ready', () => {
  console.log('✅ Dexie database initialized successfully');
  console.log(`📦 Database: ${db.name}, Version: ${db.verno}`);
  console.log(`📊 Total tables: ${db.tables.length}`);

  // Auto-add timestamps to all records on creation
  db.tables.forEach(table => {
    // Creating hook - adds created_at and updated_at timestamps
    table.hook('creating', function(primKey, obj, transaction) {
      if (!obj.created_at) {
        obj.created_at = new Date().toISOString();
      }
      if (!obj.updated_at) {
        obj.updated_at = new Date().toISOString();
      }
      // Generate ID if not provided and not auto-increment
      if (!obj.id && table.schema.primKey.name === 'id') {
        obj.id = generateUUID();
      }
    });

    // Updating hook — only auto-stamp updated_at when caller didn't set it
    // explicitly. Pull path passes the MySQL updated_at intact, so this lets
    // last-write-wins comparisons stay correct across machines.
    table.hook('updating', function(modifications, primKey, obj, transaction) {
      if (isRemoteWrite()) return modifications;
      if (modifications.updated_at === undefined) {
        modifications.updated_at = new Date().toISOString();
      }
      return modifications;
    });

    // Deleting hook - can be used for soft deletes or cascade operations
    table.hook('deleting', function(primKey, obj, transaction) {
      // Log deletion for audit trail
      if (import.meta.env.DEV) {
        console.log(`[DEXIE:DELETE] ${table.name}`, { id: primKey });
      }
    });
  });

  // Sync-critical tables — every CRUD op also lands in syncQueue.
  // MUST match SUPPORTED_TABLES in syncService.js + TABLE_DEFS in syncTableDefs.cjs.
  // Covers ledger / accounts / journal / line-item tables that previously had
  // no hook (data written via direct dexieDb.table.put() would be lost otherwise).
  const syncCriticalTables = [
    // Core entities
    'customers', 'vendors', 'suppliers', 'labour',
    // Customer-related
    'customer_ledger_entries', 'customer_jobs',
    'invoices', 'invoice_items', 'receipts', 'cash_receipts',
    // Vendor-related
    'vendor_ledger_entries', 'vendor_services',
    'vendor_orders', 'vendor_invoices', 'vendor_invoice_items', 'service_orders',
    // Supplier-related
    'supplier_ledger_entries', 'supplier_products',
    // Labour-related
    'labour_ledger_entries', 'labour_attendance', 'weekly_balances',
    // Inventory
    'inventory_categories', 'inventory_items', 'stock_movements', 'stock_transactions', 'products',
    // Accounts
    'accounts', 'purchases', 'purchase_items',
    'vouchers', 'payments',
    'gst_ledger', 'gstledger', 'gst_accounts', 'ledger_views',
    'journal_entries', 'journal_lines',
    // Jobs workflow
    'jobs', 'inspections', 'estimates', 'estimate_items',
    'jobsheets', 'jobsheet_items',
    // Challans
    'challans', 'challan', 'challan_items',
    'sell_challans', 'sellchallan', 'sell_challan_items',
    'purchase_challans', 'purchase_challan_items',
    // Settings & users
    'templates', 'roles', 'permissions', 'taxes', 'hsn_codes',
    'audit_logs', 'rate_history', 'rate_list_memory',
    'users', 'profiles', 'documents', 'branches',
    // Operations
    'daily_tasks',
  ];

  syncCriticalTables.forEach(tableName => {
    let table;
    try { table = db.table(tableName); }
    catch { return; }  // schema mismatch — skip silently

    table.hook('creating', function(primKey, obj) {
      if (isRemoteWrite()) return;
      queueSyncOperation(tableName, 'create', obj);
    });

    table.hook('updating', function(modifications, primKey, obj) {
      if (isRemoteWrite()) return;
      queueSyncOperation(tableName, 'update', { id: primKey, ...modifications });
    });

    table.hook('deleting', function(primKey, obj) {
      if (isRemoteWrite()) return;
      queueSyncOperation(tableName, 'delete', { id: primKey });
    });
  });
});

/**
 * Queue sync operation for file system sync
 * This ensures IndexedDB changes are persisted to file system
 */
const queueSyncOperation = async (tableName, operation, data) => {
  try {
    if (!db.isOpen() || !db.syncQueue) return;

    await db.syncQueue.add({
      id: generateUUID(),
      store_name: tableName,
      operation: operation,
      record_id: data?.id || null,
      data: data,
      status: 'pending',
      created_at: new Date().toISOString(),
      retry_count: 0
    });
  } catch {
    // fire-and-forget — never break the main operation
  }
};

/**
 * Observable queries for reactive updates
 * Use db.liveQuery() for automatic UI updates when data changes
 * 
 * Example usage:
 * const customers = useLiveQuery(() => db.customers.toArray());
 * 
 * This will automatically re-run the query when customers table changes
 */

// Enable debug mode for development
if (import.meta.env.DEV) {
  db.on('versionchange', (event) => {
    console.log('🔄 Database version changed:', event);
  });
  
  // Track all database operations in dev mode
  db.on('blocked', () => {
    console.warn('⚠️ Database blocked - close other tabs');
  });
  
  db.on('populate', () => {
    console.log('📝 Populating new database with initial data');
  });
}

// ── One-time repair: stringified JSON fields on synced records ───────────────
// MySQL/MariaDB sync used to hand back JSON columns (items, vehicles, …) as raw
// STRINGS. Those strings got stored in Dexie, so loading/rendering such a record
// and calling `.map()`/`.length`/spread on the field crashed the page on
// add/edit/delete. The pull path now parses JSON, but records pulled BEFORE that
// fix still hold strings. This pass walks every JSON field once and converts any
// stringified value back into a real object/array. Local-only (server copy is
// already correct), so it runs inside withRemoteWrite — no re-push, no
// updated_at bump, no last-write-wins disturbance.
const JSON_FIELD_MAP = {
  customers:         ['vehicles', 'documents'],
  vendors:           ['serviceCategories', 'certifications', 'licenseNumbers'],
  suppliers:         ['productCategories'],
  invoices:          ['items'],
  purchases:         ['materials'],
  inspections:       ['items', 'findings', 'images'],
  estimates:         ['items'],
  jobsheets:         ['items'],
  challans:          ['items'],
  challan:           ['items'],
  sell_challans:     ['items'],
  sellchallan:       ['items'],
  purchase_challans: ['items'],
  ledger_views:      ['data'],
  templates:         ['styles', 'metadata'],
  roles:             ['permissions'],
  permissions:       ['conditions'],
  rate_list_memory:  ['items', 'settings'],
  users:             ['preferences'],
  profiles:          ['permissions'],
  audit_logs:        ['details', 'metadata'],
};

export const repairSyncedJsonFields = async () => {
  try {
    const flag = await db.meta.get('json_repair_v1');
    if (flag?.done) return { skipped: true };
  } catch {
    // meta not ready — continue, the put() at the end will still flag it
  }

  let totalFixed = 0;
  for (const [store, fields] of Object.entries(JSON_FIELD_MAP)) {
    let table;
    try { table = db.table(store); } catch { continue; }

    let rows;
    try { rows = await table.toArray(); } catch { continue; }

    const fixes = [];
    for (const row of rows) {
      if (!row || row.id == null) continue;
      const patch = {};
      let changed = false;
      for (const f of fields) {
        const v = row[f];
        if (typeof v === 'string' && v.trim()) {
          try {
            const parsed = JSON.parse(v);
            if (parsed && typeof parsed === 'object') { patch[f] = parsed; changed = true; }
          } catch {
            // not valid JSON — leave the string untouched (don't lose data)
          }
        }
      }
      if (changed) fixes.push({ id: row.id, patch });
    }

    if (fixes.length) {
      await withRemoteWrite(async () => {
        for (const { id, patch } of fixes) {
          try { await table.update(id, patch); totalFixed++; } catch {}
        }
      });
    }
  }

  try {
    await db.meta.put({
      id: 'json_repair_v1',
      key: 'json_repair_v1',
      done: true,
      fixed: totalFixed,
      updated_at: new Date().toISOString(),
    });
  } catch {}

  if (totalFixed > 0) {
    console.log(`[DB Repair] Reparsed ${totalFixed} stringified JSON field(s) on synced records`);
  }
  return { fixed: totalFixed };
};

/**
 * Initialize the database (compatible with old initDB)
 * @returns {Promise<Dexie>}
 */
export const initDB = async () => {
  try {
    await db.open();
    console.log(`✅ Database initialized successfully (version ${db.verno})`);
    // Heal any legacy stringified-JSON fields left by older sync builds before
    // the UI reads them (prevents `.map is not a function` crashes on synced data).
    await repairSyncedJsonFields();
    return db;
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
    throw error;
  }
};

/**
 * Check database status
 * @returns {Promise<Object>}
 */
export const checkDatabaseStatus = async () => {
  try {
    const isOpen = db.isOpen();
    if (!isOpen) {
      await db.open();
    }
    
    return {
      exists: true,
      name: db.name,
      version: db.verno,
      expectedVersion: DB_VERSION,
      stores: db.tables.map(t => t.name),
      hasVersionConflict: db.verno !== DB_VERSION,
      isOpen: db.isOpen()
    };
  } catch (error) {
    return {
      exists: false,
      expectedVersion: DB_VERSION,
      hasVersionConflict: false,
      error: error.message
    };
  }
};

/**
 * Clear database (delete all data)
 * @returns {Promise<boolean>}
 */
export const clearDatabase = async () => {
  try {
    console.log('🗑️ Clearing database...');
    await db.delete();
    console.log('✅ Database cleared successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to clear database:', error);
    throw error;
  }
};

/**
 * Ensure a store exists (for backward compatibility)
 * @param {string} storeName 
 * @returns {Promise<Dexie.Table>}
 */
export const ensureStore = async (storeName) => {
  if (!db.isOpen()) {
    await db.open();
  }
  
  const table = db.table(storeName);
  if (!table) {
    throw new Error(`Store "${storeName}" not found in database`);
  }
  
  return table;
};

/**
 * Generate UUID (utility function)
 * @returns {string}
 */
export const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

/**
 * Auto-numbering sequences
 * @param {string} prefix 
 * @returns {Promise<number>}
 */
export const nextSequence = async (prefix) => {
  return await db.transaction('rw', db.sequences, async () => {
    const key = prefix;
    const sequence = await db.sequences.get(key);
    const current = sequence ? sequence.value : 0;
    const next = current + 1;
    
    await db.sequences.put({
      key,
      value: next,
      updated_at: new Date().toISOString()
    });
    
    return next;
  });
};

/**
 * Generate code with prefix and padding
 * @param {string} prefix 
 * @param {number} width 
 * @returns {Promise<string>}
 */
export const generateCode = async (prefix, width = 3) => {
  const n = await nextSequence(prefix);
  return `${prefix}-${String(n).padStart(width, '0')}`;
};

/**
 * Advanced Query Utilities using Dexie's powerful query API
 */

/**
 * Live query wrapper for reactive data
 * Returns an observable that auto-updates when data changes
 * @param {Function} querier - Query function
 * @returns {Observable}
 */
export const liveQuery = (querier) => {
  if (typeof Dexie.liveQuery === 'function') {
    return Dexie.liveQuery(querier);
  }
  // Fallback for older Dexie versions
  return {
    subscribe: (callback) => {
      querier().then(callback);
      return { unsubscribe: () => {} };
    }
  };
};

/**
 * Bulk operations with transaction support
 * @param {string} tableName 
 * @param {Array} operations - Array of {type: 'add'|'put'|'delete', data/key}
 * @returns {Promise}
 */
export const bulkOperation = async (tableName, operations) => {
  return await db.transaction('rw', db.table(tableName), async () => {
    const table = db.table(tableName);
    const results = [];
    
    for (const op of operations) {
      switch (op.type) {
        case 'add':
          results.push(await table.add(op.data));
          break;
        case 'put':
          results.push(await table.put(op.data));
          break;
        case 'update':
          results.push(await table.update(op.key, op.data));
          break;
        case 'delete':
          results.push(await table.delete(op.key));
          break;
      }
    }
    
    return results;
  });
};

/**
 * Advanced filtering with multiple conditions
 * @param {string} tableName 
 * @param {Object} filters - { field: value } or { field: { $gt: value, $lt: value } }
 * @returns {Promise<Array>}
 */
export const advancedQuery = async (tableName, filters = {}) => {
  const table = db.table(tableName);
  let collection = table.toCollection();
  
  // Apply filters
  for (const [field, condition] of Object.entries(filters)) {
    if (typeof condition === 'object' && condition !== null) {
      // Handle operators like $gt, $lt, $gte, $lte, $in
      if (condition.$gt !== undefined) {
        collection = collection.filter(item => item[field] > condition.$gt);
      }
      if (condition.$gte !== undefined) {
        collection = collection.filter(item => item[field] >= condition.$gte);
      }
      if (condition.$lt !== undefined) {
        collection = collection.filter(item => item[field] < condition.$lt);
      }
      if (condition.$lte !== undefined) {
        collection = collection.filter(item => item[field] <= condition.$lte);
      }
      if (condition.$in !== undefined && Array.isArray(condition.$in)) {
        collection = collection.filter(item => condition.$in.includes(item[field]));
      }
      if (condition.$ne !== undefined) {
        collection = collection.filter(item => item[field] !== condition.$ne);
      }
    } else {
      // Simple equality
      collection = collection.filter(item => item[field] === condition);
    }
  }
  
  return await collection.toArray();
};

/**
 * Pagination helper
 * @param {string} tableName 
 * @param {Object} options - { page, limit, orderBy, orderDir }
 * @returns {Promise<Object>} - { data, total, page, totalPages }
 */
export const paginate = async (tableName, options = {}) => {
  const {
    page = 1,
    limit = 10,
    orderBy = 'created_at',
    orderDir = 'desc',
    filters = {}
  } = options;
  
  const table = db.table(tableName);
  let collection = table.toCollection();
  
  // Apply filters
  if (Object.keys(filters).length > 0) {
    collection = collection.filter(item => {
      return Object.entries(filters).every(([key, value]) => item[key] === value);
    });
  }
  
  // Get total count
  const total = await collection.count();
  
  // Apply sorting
  if (orderDir === 'desc') {
    collection = collection.reverse();
  }
  
  // Apply pagination
  const offset = (page - 1) * limit;
  const data = await collection.offset(offset).limit(limit).toArray();
  
  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  };
};

/**
 * Search across multiple fields
 * @param {string} tableName 
 * @param {string} searchTerm 
 * @param {Array<string>} fields 
 * @returns {Promise<Array>}
 */
export const search = async (tableName, searchTerm, fields = []) => {
  const table = db.table(tableName);
  const lowerSearchTerm = searchTerm.toLowerCase();
  
  return await table.filter(item => {
    return fields.some(field => {
      const value = item[field];
      if (typeof value === 'string') {
        return value.toLowerCase().includes(lowerSearchTerm);
      }
      return false;
    });
  }).toArray();
};

/**
 * Aggregate functions
 */
export const aggregate = {
  /**
   * Sum of a field
   */
  sum: async (tableName, field, filters = {}) => {
    const table = db.table(tableName);
    let collection = table.toCollection();
    
    if (Object.keys(filters).length > 0) {
      collection = collection.filter(item => {
        return Object.entries(filters).every(([key, value]) => item[key] === value);
      });
    }
    
    const items = await collection.toArray();
    return items.reduce((sum, item) => sum + (parseFloat(item[field]) || 0), 0);
  },
  
  /**
   * Average of a field
   */
  avg: async (tableName, field, filters = {}) => {
    const sum = await aggregate.sum(tableName, field, filters);
    const count = await db.table(tableName).filter(item => {
      return Object.entries(filters).every(([key, value]) => item[key] === value);
    }).count();
    
    return count > 0 ? sum / count : 0;
  },
  
  /**
   * Count with filters
   */
  count: async (tableName, filters = {}) => {
    const table = db.table(tableName);
    
    if (Object.keys(filters).length === 0) {
      return await table.count();
    }
    
    return await table.filter(item => {
      return Object.entries(filters).every(([key, value]) => item[key] === value);
    }).count();
  },
  
  /**
   * Group by and count
   */
  groupBy: async (tableName, field) => {
    const items = await db.table(tableName).toArray();
    const groups = {};
    
    items.forEach(item => {
      const key = item[field];
      groups[key] = (groups[key] || 0) + 1;
    });
    
    return groups;
  }
};

/**
 * Export all data for backup
 * @returns {Promise<Object>}
 */
export const exportAllData = async () => {
  const data = {};
  
  for (const table of db.tables) {
    data[table.name] = await table.toArray();
  }
  
  return {
    version: db.verno,
    timestamp: new Date().toISOString(),
    tables: data
  };
};

/**
 * Import data from backup
 * @param {Object} backup 
 * @returns {Promise<void>}
 */
export const importAllData = async (backup) => {
  if (!backup || !backup.tables) {
    throw new Error('Invalid backup format');
  }
  
  await db.transaction('rw', db.tables, async () => {
    // Clear all tables first
    for (const table of db.tables) {
      await table.clear();
    }
    
    // Import data
    for (const [tableName, records] of Object.entries(backup.tables)) {
      if (records && records.length > 0) {
        await db.table(tableName).bulkAdd(records);
      }
    }
  });
  
  console.log('✅ Data imported successfully');
};

// Export default
export default db;
