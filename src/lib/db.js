import { 
  db as dexieDb, 
  initDB as dexieInit,
  checkDatabaseStatus as dexieCheckStatus,
  clearDatabase as dexieClear,
  ensureStore as dexieEnsureStore,
  generateUUID,
  nextSequence as dexieNextSequence,
  generateCode as dexieGenerateCode,
  liveQuery as dexieLiveQuery,
  bulkOperation as dexieBulkOperation,
  advancedQuery as dexieAdvancedQuery,
  paginate as dexiePaginate,
  search as dexieSearch,
  aggregate as dexieAggregate,
  exportAllData as dexieExportAllData,
  importAllData as dexieImportAllData
} from '../db/dexie.js';

// Dynamic import for cache manager (avoid circular dependencies)
let writeBehindCache = null;
const getCacheManager = async () => {
  if (!writeBehindCache) {
    try {
      const module = await import('../utils/writeBehindCacheManager.js');
      writeBehindCache = module.default;
    } catch (err) {
      console.warn('⚠️ Cache manager not available:', err.message);
    }
  }
  return writeBehindCache;
};

const DB_NAME = 'malwa_crm_db';
const DB_VERSION = 17; // v17: Added purchase_challan_items and sell_challan_items stores

let db = null; // Legacy compatibility - now using dexieDb

// Enable detailed logging for debugging data flow
const DEBUG_MODE = true;

const log = (operation, storeName, data) => {
  if (DEBUG_MODE) {
    console.log(`[DB:${operation}] ${storeName}`, data);
  }
};

const STORES = {
  customers: 'id',
  customer_ledger_entries: 'id',
  customer_jobs: 'id',
  invoices: 'id',
  receipts: 'id',
  cash_receipts: 'id',
  supplier_products: 'id',
  vendor_services: 'id',
  service_orders: 'id',
  vendors: 'id',
  vendor_ledger_entries: 'id',
  labour: 'id',
  labour_ledger_entries: 'id',
  labour_attendance: 'id',
  weekly_balances: 'id',
  suppliers: 'id',
  supplier_ledger_entries: 'id',
  inventory_categories: 'id',
  inventory_items: 'id',
  stock_movements: 'id',
  vouchers: 'id',
  gst_ledger: 'id', // Keep old name for backward compatibility
  gstledger: 'id', // New name to match JSON file
  purchase_challans: 'id',
  purchase_challan_items: 'id',
  sell_challans: 'id', // Keep old name for backward compatibility
  sellchallan: 'id', // New name to match JSON file
  sell_challan_items: 'id',
  branches: 'id',
  profiles: 'id',
  users: 'id',
  // Job Module Stores
  jobs: 'id',
  inspections: 'id',
  estimates: 'id',
  estimate_items: 'id',
  jobsheets: 'id',
  jobsheet_items: 'id',
  challans: 'id', // Keep old name for backward compatibility
  challan: 'id', // New name to match JSON file
  challan_items: 'id',
  stock_transactions: 'id',
  invoice_items: 'id',
  journal_entries: 'id',
  journal_lines: 'id',
  products: 'id',
  payments: 'id',
  offline_operations: 'id',
  meta: 'id',
  conflicts: 'id',
  // Account Module Stores
  accounts: 'id',
  purchases: 'id',
  purchase_items: 'id',
  gst_accounts: 'id',
  ledger_views: 'id',
  // Customer Module Stores
  documents: 'id',
  // Vendor, Labour, Supplier Module Stores
  vendor_orders: 'id',
  vendor_invoices: 'id',
  vendor_invoice_items: 'id',
  // Settings Module Stores
  templates: 'id',
  roles: 'id',
  permissions: 'id',
  taxes: 'id',
  hsn_codes: 'id',
  audit_logs: 'id',
  rate_history: 'id',
  rate_list_memory: 'id',
  sequences: 'key', // Key-value store for auto-numbering
  daily_tasks: 'id', // Daily tasks and reports
  // Missing stores found in code analysis  
  syncQueue: 'id',
  job_operations_queue: 'id',
  user_page_visibility: 'id',
  // Additional system stores
  system_logs: 'id',
  backup_history: 'id',
  sync_status: 'id'
};

/**
 * Initialize database using Dexie
 * Maintains backward compatibility with old IndexedDB implementation
 */
export const initDB = async () => {
  try {
    await dexieInit();
    db = dexieDb; // Set legacy db reference
    console.log(`✅ Database initialized with Dexie (version ${dexieDb.verno})`);
    return dexieDb;
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
};

/**
 * Check database status and version
 * Now uses Dexie instead of raw IndexedDB
 */
export const checkDatabaseStatus = async () => {
  return await dexieCheckStatus();
};

/**
 * Clear database utility function
 * Now uses Dexie's delete method
 */
export const clearDatabase = async () => {
  try {
    await dexieClear();
    db = null;
    return true;
  } catch (error) {
    console.error('❌ Failed to clear database:', error);
    throw error;
  }
};

/**
 * Get database instance
 * Returns Dexie db instance
 */
const getDB = async () => {
  if (!db || !dexieDb.isOpen()) {
    await initDB();
  }
  return dexieDb;
};

/**
 * Ensure a store exists
 * Now uses Dexie table validation
 */
export const ensureStore = async (storeName) => {
  return await dexieEnsureStore(storeName);
};

/**
 * Auto-numbering sequences using Dexie
 */
export const nextSequence = async (prefix) => {
  return await dexieNextSequence(prefix);
};

/**
 * Generate code with prefix using Dexie
 */
export const generateCode = async (prefix, width = 3) => {
  return await dexieGenerateCode(prefix, width);
};

/**
 * Database operations using Dexie
 * Maintains backward compatibility with old IndexedDB API
 */
export const dbOperations = {
  /**
   * Insert a new record
   * @param {string} storeName - Name of the object store
   * @param {object} data - Record data
   * @returns {Promise<object>} The inserted record
   */
  async insert(storeName, data) {
    try {
      const database = await getDB();
      const table = database.table(storeName);

      const record = {
        ...data,
        id: data.id || generateUUID(),
        created_at: data.created_at || new Date().toISOString(),
        updated_at: data.updated_at || new Date().toISOString()
      };

      await table.add(record);
      log('INSERT', storeName, { id: record.id });

      // Capture in write-behind cache
      const cache = await getCacheManager();
      if (cache && cache.isInitialized) {
        cache.captureChange('create', storeName, record, record.id).catch(err => {
          console.warn('⚠️ Cache capture failed (insert):', err.message);
        });
      }

      // Reliable fallback: write to syncQueue regardless of Dexie hooks
      dexieDb.syncQueue.add({
        id: generateUUID(),
        store_name: storeName,
        operation: 'create',
        record_id: record.id,
        data: record,
        status: 'pending',
        created_at: new Date().toISOString(),
        retry_count: 0
      }).catch(() => {});

      return record;
    } catch (error) {
      const errorDetails = {
        operation: 'INSERT',
        storeName,
        recordId: data.id,
        error: error.message || 'Unknown error',
        timestamp: new Date().toISOString()
      };
      console.error('🚨 Database INSERT Error:', errorDetails);
      log('INSERT_ERROR', storeName, errorDetails);
      throw new Error(`Failed to insert record in ${storeName}: ${error.message}`);
    }
  },

  /**
   * Update an existing record
   * @param {string} storeName - Name of the object store
   * @param {string} id - Record ID
   * @param {object} data - Updated data
   * @returns {Promise<object>} The updated record
   */
  async update(storeName, id, data) {
    try {
      const database = await getDB();
      const table = database.table(storeName);

      const record = await table.get(id);
      if (!record) {
        log('UPDATE_ERROR', storeName, `Record not found: ${id}`);
        throw new Error('Record not found');
      }

      const updatedRecord = {
        ...record,
        ...data,
        updated_at: new Date().toISOString()
      };

      await table.put(updatedRecord);
      log('UPDATE', storeName, { id });

      // Capture in write-behind cache
      const cache = await getCacheManager();
      if (cache && cache.isInitialized) {
        cache.captureChange('update', storeName, updatedRecord, id).catch(err => {
          console.warn('⚠️ Cache capture failed (update):', err.message);
        });
      }

      // Reliable fallback: write to syncQueue regardless of Dexie hooks
      dexieDb.syncQueue.add({
        id: generateUUID(),
        store_name: storeName,
        operation: 'update',
        record_id: id,
        data: updatedRecord,
        status: 'pending',
        created_at: new Date().toISOString(),
        retry_count: 0
      }).catch(() => {});

      return updatedRecord;
    } catch (error) {
      console.error(`❌ Failed to update record in ${storeName}:`, error);
      log('UPDATE_ERROR', storeName, error);
      throw new Error(`Failed to update record in ${storeName}: ${error.message}`);
    }
  },

  /**
   * Delete a record
   * @param {string} storeName - Name of the object store
   * @param {string} id - Record ID
   * @returns {Promise<boolean>}
   */
  async delete(storeName, id) {
    try {
      const database = await getDB();
      const table = database.table(storeName);

      await table.delete(id);
      log('DELETE', storeName, { id });

      // Capture in write-behind cache
      const cache = await getCacheManager();
      if (cache && cache.isInitialized) {
        cache.captureChange('delete', storeName, { id }, id).catch(err => {
          console.warn('⚠️ Cache capture failed (delete):', err.message);
        });
      }

      // Reliable fallback: write to syncQueue regardless of Dexie hooks
      dexieDb.syncQueue.add({
        id: generateUUID(),
        store_name: storeName,
        operation: 'delete',
        record_id: id,
        data: { id },
        status: 'pending',
        created_at: new Date().toISOString(),
        retry_count: 0
      }).catch(() => {});

      return true;
    } catch (error) {
      const errorDetails = {
        operation: 'DELETE',
        storeName,
        recordId: id,
        error: error.message || 'Unknown error',
        timestamp: new Date().toISOString()
      };
      console.error('🚨 Database DELETE Error:', errorDetails);
      log('DELETE_ERROR', storeName, errorDetails);
      throw new Error(`Failed to delete record from ${storeName}: ${error.message}`);
    }
  },

  /**
   * Get a record by ID
   * @param {string} storeName - Name of the object store
   * @param {string} id - Record ID
   * @returns {Promise<object|null>}
   */
  async getById(storeName, id) {
    try {
      const database = await getDB();
      const table = database.table(storeName);

      const result = await table.get(id);
      log('GET_BY_ID', storeName, { id, found: !!result });
      return result || null;
    } catch (error) {
      log('GET_BY_ID_ERROR', storeName, error.message);
      throw error;
    }
  },

  /**
   * Get all records from a store
   * @param {string} storeName - Name of the object store
   * @returns {Promise<Array>}
   */
  async getAll(storeName) {
    try {
      const database = await getDB();
      const table = database.table(storeName);

      const result = await table.toArray();
      log('GET_ALL', storeName, { count: result.length });
      return result;
    } catch (error) {
      log('GET_ALL_ERROR', storeName, error.message);
      throw error;
    }
  },

  /**
   * Query records with filters
   * @param {string} storeName - Name of the object store
   * @param {object} filters - Filter criteria
   * @returns {Promise<Array>}
   */
  async query(storeName, filters = {}) {
    const database = await getDB();
    const table = database.table(storeName);

    if (Object.keys(filters).length === 0) {
      return await table.toArray();
    }

    // Use Dexie's where() for efficient filtering when possible
    const filterKeys = Object.keys(filters);
    if (filterKeys.length === 1) {
      const key = filterKeys[0];
      const value = filters[key];
      
      if (value !== null && value !== undefined) {
        try {
          // Try to use index-based query
          return await table.where(key).equals(value).toArray();
        } catch (e) {
          // Index doesn't exist, fall back to filter
          return await table.filter(record => record[key] === value).toArray();
        }
      }
    }

    // Multiple filters or null values - use filter
    return await table.filter(record => {
      return Object.entries(filters).every(([key, value]) => {
        if (value === null || value === undefined) return true;
        return record[key] === value;
      });
    }).toArray();
  },

  /**
   * Get records by index
   * @param {string} storeName - Name of the object store
   * @param {string} indexName - Name of the index
   * @param {any} value - Value to search for
   * @returns {Promise<Array>}
   */
  async getByIndex(storeName, indexName, value) {
    try {
      const database = await getDB();
      const table = database.table(storeName);

      const result = await table.where(indexName).equals(value).toArray();
      log('GET_BY_INDEX', storeName, { indexName, value, count: result.length });
      return result;
    } catch (error) {
      log('INDEX_NOT_FOUND', storeName, { indexName, error: error.message });
      throw new Error(`Index '${indexName}' not found in store '${storeName}': ${error.message}`);
    }
  },

  /**
   * Count records in a store
   * @param {string} storeName - Name of the object store
   * @returns {Promise<number>}
   */
  async count(storeName) {
    const database = await getDB();
    const table = database.table(storeName);
    return await table.count();
  },

  /**
   * Clear all records from a store
   * @param {string} storeName - Name of the object store
   * @returns {Promise<boolean>}
   */
  async clear(storeName) {
    const database = await getDB();
    const table = database.table(storeName);
    await table.clear();
    return true;
  }
};

export const recalculateCustomerBalance = async (customerId) => {
  const customer = await dbOperations.getById('customers', customerId);
  if (!customer) return;

  const entries = await dbOperations.getByIndex('customer_ledger_entries', 'customer_id', customerId);
  const balance = entries.reduce((sum, entry) => sum + (entry.debit || 0) - (entry.credit || 0), 0);

  await dbOperations.update('customers', customerId, {
    current_balance: customer.opening_balance + balance
  });
};

export const recalculateVendorBalance = async (vendorId) => {
  const vendor = await dbOperations.getById('vendors', vendorId);
  if (!vendor) return;

  const entries = await dbOperations.getByIndex('vendor_ledger_entries', 'vendor_id', vendorId);
  const balance = entries.reduce((sum, entry) => sum + (entry.debit || 0) - (entry.credit || 0), 0);

  await dbOperations.update('vendors', vendorId, {
    current_balance: vendor.opening_balance + balance
  });
};

export const recalculateLabourBalance = async (labourId) => {
  const labour = await dbOperations.getById('labour', labourId);
  if (!labour) return;

  const entries = await dbOperations.getByIndex('labour_ledger_entries', 'labour_id', labourId);
  const balance = entries.reduce((sum, entry) => sum + (entry.debit || 0) - (entry.credit || 0), 0);

  await dbOperations.update('labour', labourId, {
    current_balance: labour.opening_balance + balance
  });
};

export const recalculateSupplierBalance = async (supplierId) => {
  const supplier = await dbOperations.getById('suppliers', supplierId);
  if (!supplier) return;

  const entries = await dbOperations.getByIndex('supplier_ledger_entries', 'supplier_id', supplierId);
  const balance = entries.reduce((sum, entry) => sum + (entry.debit || 0) - (entry.credit || 0), 0);

  await dbOperations.update('suppliers', supplierId, {
    current_balance: supplier.opening_balance + balance
  });
};

export const updateInventoryStock = async (itemId, movementType, quantity) => {
  const item = await dbOperations.getById('inventory_items', itemId);
  if (!item) return;

  let newStock = item.current_stock;

  if (movementType === 'in') {
    newStock += quantity;
  } else if (movementType === 'out') {
    newStock -= quantity;
  } else if (movementType === 'adjustment') {
    newStock = quantity;
  }

  await dbOperations.update('inventory_items', itemId, {
    current_stock: newStock
  });
};

// System / local-only stores that must NOT be enqueued for MySQL sync.
const NON_SYNC_STORES = new Set([
  'offline_operations', 'syncQueue', 'sync_status', 'meta', 'conflicts',
  'job_operations_queue', 'system_logs', 'backup_history', 'sequences',
  'user_page_visibility',
]);

/**
 * Execute a transaction with Dexie
 *
 * IMPORTANT — sync capture:
 * Composite "flow" writes (estimates, jobsheets, challans, invoices, journals,
 * vendor/supplier/labour/account/customer composites) run inside this
 * transaction whose scope does NOT include syncQueue. Dexie's automatic sync
 * hooks therefore cannot enqueue outgoing changes (syncQueue is out of scope)
 * and the data never reaches MySQL. To fix this for EVERY caller in one place,
 * we wrap the transaction's table handles, record every put/add/delete to a
 * sync-critical store, and enqueue them into syncQueue AFTER the transaction
 * commits (a separate write, so it always succeeds).
 *
 * @param {Array<string>} storeNames - Store names
 * @param {string} mode - Transaction mode ('r' or 'rw')
 * @param {Function} callback - Transaction callback
 * @returns {Promise<any>}
 */
export const dbTransaction = async (storeNames, mode, callback) => {
  const database = await getDB();
  const dexieMode = mode === 'readwrite' || mode === 'rw' ? 'rw' : 'r';

  // Get table references
  const tables = storeNames.map(name => database.table(name));

  // Writes captured during the transaction, enqueued for sync after commit.
  const syncCaptures = [];

  const result = await database.transaction(dexieMode, tables, async () => {
    // Create a transaction-like object for backward compatibility. For
    // read-write transactions, wrap sync-critical tables so we capture writes.
    const txn = {
      objectStore: (name) => {
        const table = database.table(name);
        if (dexieMode !== 'rw' || NON_SYNC_STORES.has(name)) return table;

        return new Proxy(table, {
          get(target, prop, receiver) {
            if (prop === 'put' || prop === 'add') {
              return (record, ...rest) => {
                if (record && typeof record === 'object' && record.id != null) {
                  syncCaptures.push({
                    store_name: name,
                    operation:  prop === 'add' ? 'create' : 'update',
                    record,
                  });
                }
                return target[prop](record, ...rest);
              };
            }
            if (prop === 'delete') {
              return (key, ...rest) => {
                if (key != null) {
                  syncCaptures.push({ store_name: name, operation: 'delete', record: { id: key } });
                }
                return target[prop](key, ...rest);
              };
            }
            const val = Reflect.get(target, prop, receiver);
            return typeof val === 'function' ? val.bind(target) : val;
          },
        });
      },
    };
    return await callback(txn);
  });

  // Enqueue captured writes for MySQL sync (outside the transaction so the
  // write to syncQueue can't fail due to transaction scope).
  if (syncCaptures.length) {
    try {
      const now = new Date().toISOString();
      await dexieDb.syncQueue.bulkAdd(syncCaptures.map(c => ({
        id: generateUUID(),
        store_name: c.store_name,
        operation:  c.operation,
        record_id:  c.record?.id,
        data:       c.record,
        status:     'pending',
        created_at: now,
        retry_count: 0,
      })));
    } catch (err) {
      console.warn('⚠️ [DB] dbTransaction sync enqueue failed:', err?.message || err);
    }
  }

  return result;
};

/**
 * Bulk put records (insert or update) using Dexie transaction
 * @param {string} storeName - Name of the object store
 * @param {Array<object>} records - Records to insert/update
 * @returns {Promise<Array>}
 */
export const bulkPut = async (storeName, records) => {
  const database = await getDB();
  const table = database.table(storeName);
  
  const recordsWithTimestamps = records.map(record => ({
    ...record,
    updated_at: record.updated_at || new Date().toISOString()
  }));

  // Dexie's bulkPut is atomic - all or nothing
  await table.bulkPut(recordsWithTimestamps);
  return recordsWithTimestamps;
};

/**
 * Bulk get records by IDs using Dexie
 * @param {string} storeName - Name of the object store
 * @param {Array<string>} ids - Record IDs
 * @returns {Promise<Array>}
 */
export const bulkGet = async (storeName, ids) => {
  const database = await getDB();
  const table = database.table(storeName);
  
  // Dexie's bulkGet returns results in the same order as ids
  const results = await table.bulkGet(ids);
  // Filter out undefined values (records not found)
  return results.filter(r => r !== undefined);
};

/**
 * Advanced query operations using Dexie utilities
 */
export const advancedQuery = dexieAdvancedQuery;

/**
 * Pagination helper
 */
export const paginate = dexiePaginate;

/**
 * Search utility
 */
export const search = dexieSearch;

/**
 * Aggregate operations (sum, avg, count, groupBy)
 */
export const aggregate = dexieAggregate;

/**
 * Bulk operations with transaction support
 */
export const bulkOperation = dexieBulkOperation;

/**
 * Live query for reactive data (use with React hooks)
 */
export const liveQuery = dexieLiveQuery;

/**
 * Export all data for backup
 */
export const exportAllData = dexieExportAllData;

/**
 * Import data from backup
 */
export const importAllData = dexieImportAllData;

// Export Dexie instance for advanced usage
export { dexieDb as db };

// Export generateUUID for external usage
export { generateUUID };

// Default export for backward compatibility
export default {
  initDB,
  checkDatabaseStatus,
  clearDatabase,
  ensureStore,
  dbOperations,
  nextSequence,
  generateCode,
  recalculateCustomerBalance,
  recalculateVendorBalance,
  recalculateLabourBalance,
  recalculateSupplierBalance,
  updateInventoryStock,
  dbTransaction,
  bulkPut,
  bulkGet,
  advancedQuery,
  paginate,
  search,
  aggregate,
  bulkOperation,
  liveQuery,
  exportAllData,
  importAllData,
  generateUUID,
  db: dexieDb
};
