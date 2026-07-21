/**
 * Cached Database Operations for Malwa CRM v4
 * Integrated with Backend Architecture
 * 
 * This module wraps all database CRUD operations with write-behind cache
 * to ensure instant frontend response and deferred backend sync
 * 
 * Backend Integration:
 * - Uses Dexie.js wrapper (malwa_crm_db v17)
 * - Supports all 91+ IndexedDB stores
 * - Integrates with offline_operations queue
 * - Follows dual storage strategy (IndexedDB + File System)
 * - Syncs to C:/malwa-crm/Data_base/ every 8 hours
 * 
 * Usage:
 * Replace: import { dbOperations } from '@/lib/db.js';
 * With:    import cachedDb from '@/utils/cachedDbOperations.js';
 */

import { dbOperations } from '@/lib/db.js';
import writeBehindCache from './writeBehindCacheManager.js';

class CachedDatabaseOperations {
  constructor() {
    this.db = dbOperations; // Dexie-powered operations
    this.cache = writeBehindCache;
    this.cacheEnabled = true; // Can be toggled for testing
    
    // All 91+ stores from backend architecture
    this.ALL_STORES = [
      // Customer Module (10 stores)
      'customers', 'customer_ledger_entries', 'customer_jobs', 'invoices', 'invoice_items', 
      'receipts', 'cash_receipts', 'documents',
      
      // Jobs Module (10 stores)
      'jobs', 'inspections', 'estimates', 'estimate_items', 'jobsheets', 'jobsheet_items', 
      'challans', 'challan_items', 'challan', 'stock_transactions',
      
      // Vendor Module (7 stores)
      'vendors', 'vendor_ledger_entries', 'vendor_services', 'service_orders', 
      'vendor_orders', 'vendor_invoices', 'vendor_invoice_items',
      
      // Labour Module (4 stores)
      'labour', 'labour_ledger_entries', 'labour_attendance', 'weekly_balances',
      
      // Supplier Module (3 stores)
      'suppliers', 'supplier_ledger_entries', 'supplier_products',
      
      // Inventory Module (3 stores)
      'inventory_categories', 'inventory_items', 'stock_movements',
      
      // Accounts Module (12 stores)
      'accounts', 'vouchers', 'gstledger', 'gst_ledger', 'purchase_challans', 'purchase_challan_items',
      'sellchallan', 'sell_challans', 'sell_challan_items', 'journal_entries', 'journal_lines',
      'gst_accounts', 'ledger_views', 'purchases', 'purchase_items',
      
      // Settings Module (12 stores)
      'settings', 'branches', 'roles', 'permissions', 'templates', 'taxes', 
      'hsn_codes', 'audit_logs', 'rate_history', 'rate_list_memory', 
      'sequences', 'daily_tasks',
      
      // Financial Module (2 stores)
      'payments', 'products',
      
      // System Stores (9 stores)
      'meta', 'profiles', 'users', 'conflicts', 'offline_operations', 
      'syncQueue', 'job_operations_queue', 'user_page_visibility', 
      'system_logs', 'backup_history', 'sync_status'
    ];
  }

  /**
   * Check if cache is available
   */
  isCacheAvailable() {
    return this.cacheEnabled && this.cache && this.cache.isInitialized;
  }

  // ==========================================
  // CREATE OPERATIONS
  // ==========================================

  /**
   * Insert a new record with cache (Dexie-powered)
   * Automatically generates UUID and timestamps
   */
  async insert(storeName, data) {
    try {
      // Validate store name
      if (!this.ALL_STORES.includes(storeName)) {
        console.warn(`⚠️ [CACHED-DB] Store "${storeName}" not in known stores list`);
      }
      
      // Add timestamps if not present (backend pattern)
      const dataWithTimestamps = {
        ...data,
        created_at: data.created_at || new Date().toISOString(),
        updated_at: data.updated_at || new Date().toISOString()
      };
      
      // Insert into IndexedDB first (instant - Dexie)
      const result = await this.db.insert(storeName, dataWithTimestamps);
      
      // Capture in cache (async, non-blocking)
      if (this.isCacheAvailable()) {
        this.cache.captureChange('create', storeName, dataWithTimestamps, result.id || result).catch(err => {
          console.warn('⚠️ [CACHED-DB] Cache capture failed:', err);
          // Log to offline_operations for retry
          this.addToOfflineOperations(storeName, 'create', dataWithTimestamps, err.message);
        });
      }
      
      return result;
    } catch (error) {
      console.error(`❌ [CACHED-DB] Insert failed for ${storeName}:`, error);
      throw error;
    }
  }

  /**
   * Update a record with cache (preserves updated_at timestamp)
   */
  async update(storeName, id, data) {
    try {
      // Add updated_at timestamp (backend pattern)
      const dataWithTimestamp = {
        ...data,
        updated_at: new Date().toISOString()
      };
      
      // Update in IndexedDB first
      const result = await this.db.update(storeName, id, dataWithTimestamp);
      
      // Capture in cache
      if (this.isCacheAvailable()) {
        this.cache.captureChange('update', storeName, dataWithTimestamp, id).catch(err => {
          console.warn('⚠️ [CACHED-DB] Cache capture failed:', err);
          this.addToOfflineOperations(storeName, 'update', { id, ...dataWithTimestamp }, err.message);
        });
      }
      
      return result;
    } catch (error) {
      console.error(`❌ [CACHED-DB] Update failed for ${storeName}:`, error);
      throw error;
    }
  }

  /**
   * Add to offline_operations queue (backend integration)
   */
  async addToOfflineOperations(storeName, operation, data, errorMessage) {
    try {
      if (!this.db.insert) return;
      
      await this.db.insert('offline_operations', {
        id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        storeName,
        operation,
        data,
        status: 'pending',
        error: errorMessage,
        createdAt: new Date().toISOString(),
        retries: 0,
        priority: 'normal'
      });
      
      console.log(`📝 [CACHED-DB] Added to offline_operations: ${operation} ${storeName}`);
    } catch (error) {
      console.error('❌ [CACHED-DB] Failed to add to offline_operations:', error);
    }
  }

  /**
   * Bulk insert with cache
   */
  async bulkInsert(storeName, dataArray) {
    try {
      // Insert into IndexedDB
      const results = await this.db.bulkInsert(storeName, dataArray);
      
      // Capture in cache
      if (this.isCacheAvailable()) {
        for (let i = 0; i < dataArray.length; i++) {
          this.cache.captureChange('create', storeName, dataArray[i], results[i]?.id || results[i]).catch(err => {
            console.warn('⚠️ [CACHED-DB] Bulk cache capture failed:', err);
          });
        }
      }
      
      return results;
    } catch (error) {
      console.error(`❌ [CACHED-DB] Bulk insert failed for ${storeName}:`, error);
      throw error;
    }
  }

  // ==========================================
  // READ OPERATIONS (No cache needed - direct read)
  // ==========================================

  /**
   * Get a single record by ID
   */
  async get(storeName, id) {
    return await this.db.get(storeName, id);
  }

  /**
   * Alias for get() - for backward compatibility
   */
  async getById(storeName, id) {
    return await this.get(storeName, id);
  }

  /**
   * Get all records from a store
   */
  async getAll(storeName) {
    return await this.db.getAll(storeName);
  }

  /**
   * Query records with filter
   */
  async query(storeName, filter) {
    return await this.db.query(storeName, filter);
  }

  /**
   * Find records
   */
  async find(storeName, criteria) {
    return await this.db.find(storeName, criteria);
  }

  /**
   * Count records
   */
  async count(storeName) {
    return await this.db.count(storeName);
  }

  // ==========================================
  // UPDATE OPERATIONS
  // ==========================================

  /**
   * Update a record with cache
   */
  async update(storeName, id, data) {
    try {
      // Update in IndexedDB first
      const result = await this.db.update(storeName, id, data);
      
      // Capture in cache
      if (this.isCacheAvailable()) {
        this.cache.captureChange('update', storeName, data, id).catch(err => {
          console.warn('⚠️ [CACHED-DB] Cache capture failed:', err);
        });
      }
      
      return result;
    } catch (error) {
      console.error(`❌ [CACHED-DB] Update failed for ${storeName}:`, error);
      throw error;
    }
  }

  /**
   * Bulk update with cache
   */
  async bulkUpdate(storeName, updates) {
    try {
      // Update in IndexedDB
      const results = await this.db.bulkUpdate(storeName, updates);
      
      // Capture in cache
      if (this.isCacheAvailable()) {
        for (const update of updates) {
          this.cache.captureChange('update', storeName, update.data, update.id).catch(err => {
            console.warn('⚠️ [CACHED-DB] Bulk cache capture failed:', err);
          });
        }
      }
      
      return results;
    } catch (error) {
      console.error(`❌ [CACHED-DB] Bulk update failed for ${storeName}:`, error);
      throw error;
    }
  }

  // ==========================================
  // DELETE OPERATIONS
  // ==========================================

  /**
   * Delete a record with cache
   */
  async delete(storeName, id) {
    try {
      // Delete from IndexedDB first
      const result = await this.db.delete(storeName, id);
      
      // Capture in cache
      if (this.isCacheAvailable()) {
        this.cache.captureChange('delete', storeName, { id }, id).catch(err => {
          console.warn('⚠️ [CACHED-DB] Cache capture failed:', err);
        });
      }
      
      return result;
    } catch (error) {
      console.error(`❌ [CACHED-DB] Delete failed for ${storeName}:`, error);
      throw error;
    }
  }

  /**
   * Bulk delete with cache
   */
  async bulkDelete(storeName, ids) {
    try {
      // Delete from IndexedDB
      const results = await this.db.bulkDelete(storeName, ids);
      
      // Capture in cache
      if (this.isCacheAvailable()) {
        for (const id of ids) {
          this.cache.captureChange('delete', storeName, { id }, id).catch(err => {
            console.warn('⚠️ [CACHED-DB] Bulk cache capture failed:', err);
          });
        }
      }
      
      return results;
    } catch (error) {
      console.error(`❌ [CACHED-DB] Bulk delete failed for ${storeName}:`, error);
      throw error;
    }
  }

  /**
   * Clear all records from a store with cache
   */
  async clear(storeName) {
    try {
      // Clear from IndexedDB
      const result = await this.db.clear(storeName);
      
      // Capture in cache
      if (this.isCacheAvailable()) {
        this.cache.captureChange('clear', storeName, {}, null).catch(err => {
          console.warn('⚠️ [CACHED-DB] Cache capture failed:', err);
        });
      }
      
      return result;
    } catch (error) {
      console.error(`❌ [CACHED-DB] Clear failed for ${storeName}:`, error);
      throw error;
    }
  }

  // ==========================================
  // UTILITY METHODS
  // ==========================================

  /**
   * Execute a transaction
   */
  async transaction(storeNames, mode, callback) {
    // Transactions are handled directly by IndexedDB
    // Cache captures happen at the operation level
    return await this.db.transaction(storeNames, mode, callback);
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    if (!this.isCacheAvailable()) {
      return { enabled: false, message: 'Cache not available' };
    }
    return this.cache.getStats();
  }

  /**
   * Get cache status
   */
  getCacheStatus() {
    if (!this.isCacheAvailable()) {
      return { enabled: false, message: 'Cache not available' };
    }
    return this.cache.getStatus();
  }

  /**
   * Manually trigger cache upload
   */
  async uploadCache() {
    if (!this.isCacheAvailable()) {
      return { success: false, reason: 'cache-not-available' };
    }
    return await this.cache.manualUpload();
  }

  /**
   * Enable/disable cache
   */
  toggleCache(enabled) {
    this.cacheEnabled = enabled;
    console.log(`🔧 [CACHED-DB] Cache ${enabled ? 'enabled' : 'disabled'}`);
  }
}

// Create singleton instance
const cachedDb = new CachedDatabaseOperations();

// Expose to window for debugging
if (typeof window !== 'undefined') {
  window.cachedDb = {
    stats: () => cachedDb.getCacheStats(),
    status: () => cachedDb.getCacheStatus(),
    upload: () => cachedDb.uploadCache(),
    toggle: (enabled) => cachedDb.toggleCache(enabled),
    
    // Direct access to operations
    insert: (store, data) => cachedDb.insert(store, data),
    update: (store, id, data) => cachedDb.update(store, id, data),
    delete: (store, id) => cachedDb.delete(store, id),
    get: (store, id) => cachedDb.get(store, id),
    getAll: (store) => cachedDb.getAll(store),
  };
  
  console.log('🔧 [CACHED-DB] Cached Database Operations loaded!');
  console.log('📋 Available commands:');
  console.log('  • window.cachedDb.stats() - Get cache statistics');
  console.log('  • window.cachedDb.status() - Get cache status');
  console.log('  • window.cachedDb.upload() - Trigger manual upload');
  console.log('  • window.cachedDb.toggle(true/false) - Enable/disable cache');
}

export default cachedDb;
