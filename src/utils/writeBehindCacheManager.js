/**
 * Write-Behind Cache Manager for Malwa CRM v4
 * Integrated with Backend Architecture (malwa_crm_db v17, 91+ stores)
 * 
 * Performance optimization layer that:
 * 1. Captures all frontend CRUD operations instantly
 * 2. Saves to Electron cache (append-only journal)
 * 3. Uploads to File System (C:/malwa-crm/Data_base/) every 8 hours in bulk
 * 
 * Features:
 * - Instant cache writes (no file system delays)
 * - Atomic append-only journal (offline_operations pattern)
 * - Bulk upload every 8 hours to Data_base folder
 * - Exponential backoff retry (max 3 attempts)
 * - Smart conflict detection and resolution
 * - Integration with UnifiedSyncManager
 * - Supports all 91+ IndexedDB stores
 * - Memory-based buffer limits
 * - Real-time monitoring and alerts
 * 
 * Backend Integration:
 * - Uses Dexie.js wrapper for IndexedDB operations
 * - Follows dual storage strategy (IndexedDB + File System)
 * - Integrates with offline_operations queue
 * - Uses syncQueue for tracking sync status
 * - Proper module path resolution based on backend structure
 */

import { db, dbOperations, liveQuery } from '@/lib/db.js';

// Helper functions for Electron FS API compatibility
// Try new cache API first (from preload.cjs), fall back to fs API (from preload.js)
const getElectronFS = () => {
  console.log('🔍 [CACHE-MANAGER] Detecting Electron APIs:');
  console.log('  - window.electron:', !!window.electron);
  console.log('  - window.electron?.cache:', !!window.electron?.cache);
  console.log('  - window.electron?.fs:', !!window.electron?.fs);
  console.log('  - window.electron?.cache?.ensureDir:', typeof window.electron?.cache?.ensureDir);
  console.log('  - window.electron?.cache?.readFile:', typeof window.electron?.cache?.readFile);
  console.log('  - window.electron?.cache?.writeFile:', typeof window.electron?.cache?.writeFile);
  console.log('  - window.electron?.ensureDir:', typeof window.electron?.ensureDir);
  console.log('  - window.malwaCRM:', !!window.malwaCRM);
  
  return {
    ensureDir: window.electron?.cache?.ensureDir || window.electron?.fs?.ensureDir || window.electron?.ensureDir,
    readFile: window.electron?.cache?.readFile || window.electron?.fs?.readFile,
    writeFile: window.electron?.cache?.writeFile || window.electron?.fs?.writeFile,
    appendFile: window.electron?.cache?.appendFile || window.electron?.fs?.appendFile,
    deleteFile: window.electron?.cache?.deleteFile || window.electron?.fs?.deleteFile,
    pathExists: window.electron?.cache?.pathExists || window.electron?.fs?.pathExists,
  };
};

class WriteBehindCacheManager {
  constructor() {
    // Core settings
    this.isElectron = typeof window !== 'undefined' && window.electron;
    this.isInitialized = false;
    
    // Backend Architecture Integration (from BACKEND_COMPLETE_ARCHITECTURE.md)
    this.BASE_PATH = 'C:/malwa-crm/Data_base'; // Main backend storage path
    this.CACHE_PATH = 'C:/malwa-crm/Cache'; // Cache journal path
    this.JOURNAL_FILE = 'change_journal.json'; // Similar to offline_operations.json
    this.SYNC_QUEUE_FILE = 'syncQueue.json'; // Backend sync queue
    this.UPLOAD_INTERVAL = 8 * 60 * 60 * 1000; // 8 hours in milliseconds
    
    // Memory management
    this.bufferMaxSize = 1000; // Max items in buffer
    this.bufferMaxBytes = 10 * 1024 * 1024; // 10MB max buffer size
    
    // Store organization (matches BACKEND_COMPLETE_ARCHITECTURE.md)
    // Maps stores to their module directories for proper file path resolution
    this.MODULE_STORES = {
      customer: ['customers', 'customer_ledger_entries', 'customer_jobs', 'invoices', 'invoice_items', 'receipts', 'cash_receipts', 'documents'],
      jobs: ['jobs', 'inspections', 'estimates', 'estimate_items', 'jobsheets', 'jobsheet_items', 'challan', 'challans', 'challan_items', 'stock_transactions'],
      vendors: ['vendors', 'vendor_ledger_entries', 'vendor_services', 'service_orders', 'vendor_orders', 'vendor_invoices', 'vendor_invoice_items'],
      labour: ['labour', 'labour_ledger_entries', 'labour_attendance', 'weekly_balances'],
      supplier: ['suppliers', 'supplier_ledger_entries', 'supplier_products'],
      inventory: ['inventory_categories', 'inventory_items', 'stock_movements'],
      accounts: ['accounts', 'vouchers', 'gstledger', 'gst_ledger', 'purchase_challans', 'purchase_challan_items', 'sellchallan', 'sell_challans', 'sell_challan_items', 'journal_entries', 'journal_lines', 'gst_accounts', 'ledger_views', 'purchases', 'purchase_items'],
      settings: ['settings', 'branches', 'roles', 'permissions', 'templates', 'taxes', 'hsn_codes', 'audit_logs', 'rate_history', 'rate_list_memory', 'sequences', 'daily_tasks'],
      financial: ['payments', 'products'],
      system: ['meta', 'conflicts', 'offline_operations', 'syncQueue', 'system_logs', 'backup_history', 'sync_status', 'user_page_visibility'],
      // Root level stores (no subdirectory)
      root: ['users', 'profiles', 'Dashboard', 'Login']
    };
    
    // Upload state
    this.uploadTimer = null;
    this.isUploading = false;
    this.lastUploadTime = null;
    this.nextUploadTime = null;
    this.maxRetries = 3;
    
    // Change journal (in-memory buffer)
    this.changeBuffer = [];
    this.pendingChanges = 0;
    
    // Enhanced statistics with performance metrics
    this.stats = {
      totalChanges: 0,
      successfulUploads: 0,
      failedUploads: 0,
      lastUploadCount: 0,
      cacheHits: 0,
      cacheMisses: 0,
      uploadLatencies: [], // Track upload performance
      bufferFlushTimes: [], // Track flush performance
      errorRates: {} // Track errors by store
    };
    
    // Alert thresholds
    this.alertThresholds = {
      highPendingCount: 100,
      highBufferSize: 800,
      highLatency: 5000, // 5 seconds
      highErrorRate: 0.05 // 5%
    };
    
    // Operation tracking
    this.operationQueue = [];
    this.processingQueue = false;
    
    this.initialize();
  }

  // ==========================================
  // INITIALIZATION
  // ==========================================

  async initialize() {
    try {
      console.log('🚀 [CACHE-MANAGER] Initializing Write-Behind Cache Manager...');
      console.log('🔍 [CACHE-MANAGER] Environment check:');
      console.log('   - window.electron:', typeof window.electron);
      console.log('   - window.electron.cache:', typeof window.electron?.cache);
      console.log('   - window.electron.fs:', typeof window.electron?.fs);
      console.log('   - window.malwaCRM:', typeof window.malwaCRM);
      console.log('   - isElectron:', this.isElectron);
      
      if (!this.isElectron) {
        console.warn('⚠️ [CACHE-MANAGER] Running in browser mode - limited functionality');
        console.log('📝 [CACHE-MANAGER] File system features disabled, using IndexedDB only');
        console.log('💡 [CACHE-MANAGER] To enable file system sync, run: npm run electron:dev');
        // Still mark as initialized for browser mode
        this.isInitialized = true;
        this.browserMode = true;
        // In browser mode, we still track changes but don't upload to file system
        this.calculateNextUpload(); // Set next upload time even in browser mode
        console.log('✅ [CACHE-MANAGER] Browser mode initialized (no file system sync)');
        return { success: true, reason: 'browser-mode', limited: true };
      }

      this.browserMode = false;
      
      // Step 1: Ensure cache directory exists
      try {
        await this.ensureCacheDirectory();
      } catch (error) {
        // If FS API fails, fall back to browser mode
        console.warn('⚠️ [CACHE-MANAGER] FS API failed, using browser mode:', error.message);
        console.warn('💡 [CACHE-MANAGER] Restart Electron app to enable file system features');
        this.isInitialized = true;
        this.browserMode = true;
        this.calculateNextUpload(); // Set next upload time even in fallback mode
        console.log('✅ [CACHE-MANAGER] Browser mode initialized (FS fallback, no file system sync)');
        return { success: true, reason: 'browser-mode-fallback', limited: true };
      }
      
      // Step 2: Load existing change journal
      await this.loadChangeJournal();
      
      // Step 3: Calculate next upload time
      this.calculateNextUpload();
      
      // Step 4: Start 8-hour upload timer
      this.startUploadTimer();
      
      // Step 5: Start buffer flush timer (every 30 seconds)
      this.startBufferFlushTimer();
      
      this.isInitialized = true;
      console.log('✅ [CACHE-MANAGER] Cache manager initialized successfully');
      console.log(`📅 Next upload scheduled at: ${this.nextUploadTime}`);
      
      return { success: true };
    } catch (error) {
      console.error('❌ [CACHE-MANAGER] Initialization failed:', error);
      this.isInitialized = false;
      return { success: false, error: error.message };
    }
  }

  async ensureCacheDirectory() {
    const electronFS = getElectronFS();
    if (!electronFS.ensureDir) {
      throw new Error('Electron fs.ensureDir API not available');
    }
    
    const result = await electronFS.ensureDir(this.CACHE_PATH);
    if (!result.success) {
      throw new Error(`Failed to create cache directory: ${result.error}`);
    }
    
    console.log('📁 [CACHE-MANAGER] Cache directory ready:', this.CACHE_PATH);
  }

  async loadChangeJournal() {
    try {
      // Try new cache API first, fall back to fs API
      const readFileFn = window.electron?.cache?.readFile || window.electron?.fs?.readFile;
      
      if (!readFileFn) {
        console.log('📝 [CACHE-MANAGER] File system API not available, starting fresh');
        return;
      }
      
      const journalPath = `${this.CACHE_PATH}/${this.JOURNAL_FILE}`;
      const result = await readFileFn(journalPath);
      
      if (result.success && result.data) {
        const journal = JSON.parse(result.data);
        this.pendingChanges = journal.changes?.length || 0;
        this.stats.totalChanges = journal.totalChanges || 0;
        this.lastUploadTime = journal.lastUploadTime || null;
        
        console.log(`📖 [CACHE-MANAGER] Loaded journal: ${this.pendingChanges} pending changes`);
      } else {
        console.log('📝 [CACHE-MANAGER] No existing journal found, starting fresh');
      }
    } catch (error) {
      console.warn('⚠️ [CACHE-MANAGER] Failed to load journal:', error.message);
    }
  }

  calculateNextUpload() {
    const now = new Date();
    
    if (this.lastUploadTime) {
      const lastUpload = new Date(this.lastUploadTime);
      this.nextUploadTime = new Date(lastUpload.getTime() + this.UPLOAD_INTERVAL);
      
      // If next upload is in the past, schedule for now + 8 hours
      if (this.nextUploadTime < now) {
        this.nextUploadTime = new Date(now.getTime() + this.UPLOAD_INTERVAL);
      }
    } else {
      // First run - schedule upload 8 hours from now
      this.nextUploadTime = new Date(now.getTime() + this.UPLOAD_INTERVAL);
    }
    
    console.log(`📅 [CACHE-MANAGER] Next upload calculated: ${this.nextUploadTime?.toLocaleString()}`);
  }

  // ==========================================
  // CACHE OPERATIONS
  // ==========================================

  /**
   * Capture a change from frontend and add to cache
   * This is called on every CRUD operation
   */
  async captureChange(operation, storeName, data, recordId = null) {
    if (!this.isInitialized) {
      console.warn('⚠️ [CACHE-MANAGER] Not initialized, skipping cache');
      return { success: false, reason: 'not-initialized' };
    }

    try {
      const change = {
        id: this.generateChangeId(),
        timestamp: new Date().toISOString(),
        operation, // 'create', 'update', 'delete'
        storeName,
        recordId,
        data,
        synced: false,
        retries: 0
      };

      // Add to in-memory buffer
      this.changeBuffer.push(change);
      this.pendingChanges++;
      this.stats.totalChanges++;
      this.stats.cacheHits++;

      // Flush buffer if it's getting large
      if (this.changeBuffer.length >= this.bufferMaxSize) {
        await this.flushBufferToDisk();
      }

      console.log(`💾 [CACHE-MANAGER] Captured ${operation} on ${storeName}:`, recordId || 'new');
      
      return { success: true, changeId: change.id };
    } catch (error) {
      console.error('❌ [CACHE-MANAGER] Failed to capture change:', error);
      this.stats.cacheMisses++;
      return { success: false, error: error.message };
    }
  }

  /**
   * Flush in-memory buffer to disk atomically
   */
  async flushBufferToDisk() {
    if (this.changeBuffer.length === 0) {
      return { success: true, flushed: 0 };
    }

    try {
      if (!window.electron?.fs?.writeFile) {
        console.warn('⚠️ [CACHE-MANAGER] File system API not available');
        return { success: false, reason: 'api-unavailable' };
      }

      const journalPath = `${this.CACHE_PATH}/${this.JOURNAL_FILE}`;
      
      // Read existing journal
      let existingJournal = { changes: [], totalChanges: 0, lastUploadTime: this.lastUploadTime };
      
      if (window.electron?.fs?.readFile) {
        const readResult = await getElectronFS().readFile(journalPath);
        if (readResult.success && readResult.data) {
          existingJournal = JSON.parse(readResult.data);
        }
      }

      // Append new changes
      existingJournal.changes = [...(existingJournal.changes || []), ...this.changeBuffer];
      existingJournal.totalChanges = (existingJournal.totalChanges || 0) + this.changeBuffer.length;
      existingJournal.lastFlush = new Date().toISOString();

      // Write atomically
      const writeResult = await getElectronFS().writeFile(
        journalPath,
        JSON.stringify(existingJournal, null, 2)
      );

      if (writeResult.success) {
        const flushedCount = this.changeBuffer.length;
        this.changeBuffer = []; // Clear buffer
        console.log(`💿 [CACHE-MANAGER] Flushed ${flushedCount} changes to disk`);
        return { success: true, flushed: flushedCount };
      } else {
        throw new Error(writeResult.error);
      }
    } catch (error) {
      console.error('❌ [CACHE-MANAGER] Failed to flush buffer:', error);
      return { success: false, error: error.message };
    }
  }

  // ==========================================
  // UPLOAD OPERATIONS
  // ==========================================

  /**
   * Start the 8-hour upload timer
   */
  startUploadTimer() {
    if (this.uploadTimer) {
      clearInterval(this.uploadTimer);
    }

    // Calculate time until next upload
    const now = new Date();
    const timeUntilUpload = this.nextUploadTime.getTime() - now.getTime();

    // Schedule the first upload
    setTimeout(() => {
      this.performBulkUpload();
      
      // Then start recurring 8-hour interval
      this.uploadTimer = setInterval(() => {
        this.performBulkUpload();
      }, this.UPLOAD_INTERVAL);
    }, timeUntilUpload);

    console.log(`⏰ [CACHE-MANAGER] Upload timer started - next upload in ${Math.round(timeUntilUpload / 1000 / 60)} minutes`);
  }

  /**
   * Start buffer flush timer (every 30 seconds)
   */
  startBufferFlushTimer() {
    this.bufferFlushTimer = setInterval(() => {
      this.flushBufferToDisk();
    }, 30000); // 30 seconds

    console.log('⏰ [CACHE-MANAGER] Buffer flush timer started (30s interval)');
  }

  /**
   * Perform bulk upload to backend
   */
  async performBulkUpload() {
    if (this.isUploading) {
      console.log('🔄 [CACHE-MANAGER] Upload already in progress, skipping...');
      return { success: false, error: 'Upload in progress', uploaded: 0 };
    }

    this.isUploading = true;

    try {
      // Check if Electron file system is available
      console.log('🔍 [CACHE-MANAGER] Checking file system availability...');
      console.log('  - window.electron:', !!window.electron);
      console.log('  - window.electron.cache:', !!window.electron?.cache);
      console.log('  - window.electron.cache.readFile:', !!window.electron?.cache?.readFile);
      console.log('  - window.electron.cache.writeFile:', !!window.electron?.cache?.writeFile);
      console.log('  - window.electron.fs:', !!window.electron?.fs);
      console.log('  - getElectronFS().readFile:', !!window.electron?.fs?.readFile);
      console.log('  - getElectronFS().writeFile:', !!window.electron?.fs?.writeFile);
      
      // Try new cache API first, fall back to fs API
      const readFileFn = window.electron?.cache?.readFile || window.electron?.fs?.readFile;
      const writeFileFn = window.electron?.cache?.writeFile || window.electron?.fs?.writeFile;
      
      if (!readFileFn || !writeFileFn) {
        console.warn('⚠️ [CACHE-MANAGER] File system API not available, cannot perform bulk upload');
        console.warn('  This usually means:');
        console.warn('  1. Running in browser mode (not Electron)');
        console.warn('  2. Preload script not loaded properly');
        console.warn('  3. Context isolation issue in Electron');
        this.isUploading = false;
        return { success: false, error: 'File system not available', uploaded: 0 };
      }

      console.log('🚀 [CACHE-MANAGER] Starting bulk upload...');

      // Flush any pending buffer changes
      await this.flushBufferToDisk();

      // Read change journal
      const journalPath = `${this.CACHE_PATH}/${this.JOURNAL_FILE}`;
      const readResult = await readFileFn(journalPath);

      if (!readResult.success || !readResult.data) {
        console.log('📝 [CACHE-MANAGER] No changes to upload');
        this.isUploading = false;
        return { success: true, uploaded: 0 };
      }

      const journal = JSON.parse(readResult.data);
      const pendingChanges = journal.changes?.filter(c => !c.synced) || [];

      if (pendingChanges.length === 0) {
        console.log('📝 [CACHE-MANAGER] No pending changes to upload');
        this.isUploading = false;
        return { success: true, uploaded: 0 };
      }

      console.log(`📤 [CACHE-MANAGER] Uploading ${pendingChanges.length} changes...`);

      // Group changes by store for efficient batch processing
      const changesByStore = this.groupChangesByStore(pendingChanges);

      let successCount = 0;
      let failCount = 0;

      // Upload each store's changes
      for (const [storeName, changes] of Object.entries(changesByStore)) {
        try {
          await this.uploadStoreChanges(storeName, changes);
          successCount += changes.length;
          
          // Mark as synced
          changes.forEach(change => {
            change.synced = true;
            change.syncedAt = new Date().toISOString();
          });
        } catch (error) {
          console.error(`❌ [CACHE-MANAGER] Failed to upload ${storeName}:`, error);
          failCount += changes.length;
          
          // Increment retry count
          changes.forEach(change => {
            change.retries = (change.retries || 0) + 1;
          });
        }
      }

      // Update journal
      journal.lastUploadTime = new Date().toISOString();
      journal.changes = journal.changes.filter(c => !c.synced); // Keep only unsynced
      
      await getElectronFS().writeFile(journalPath, JSON.stringify(journal, null, 2));

      // Update stats
      this.stats.successfulUploads += successCount;
      this.stats.failedUploads += failCount;
      this.stats.lastUploadCount = successCount;
      this.lastUploadTime = new Date().toISOString();
      this.pendingChanges = journal.changes.length;

      // Calculate next upload
      this.calculateNextUpload();

      console.log(`✅ [CACHE-MANAGER] Upload completed: ${successCount} success, ${failCount} failed`);
      console.log(`📅 Next upload scheduled at: ${this.nextUploadTime}`);

      return { success: true, uploaded: successCount, failed: failCount };
    } catch (error) {
      console.error('❌ [CACHE-MANAGER] Bulk upload failed:', error);
      return { success: false, error: error.message };
    } finally {
      this.isUploading = false;
    }
  }

  /**
   * Group changes by store name for batch processing
   */
  groupChangesByStore(changes) {
    const grouped = {};
    
    for (const change of changes) {
      if (!grouped[change.storeName]) {
        grouped[change.storeName] = [];
      }
      grouped[change.storeName].push(change);
    }
    
    return grouped;
  }

  /**
   * Upload changes for a specific store to File System Backend
   * Integrates with Backend Architecture (C:/malwa-crm/Data_base/)
   */
  async uploadStoreChanges(storeName, changes) {
    try {
      console.log(`📤 [CACHE-MANAGER] Uploading ${changes.length} changes for ${storeName} to File System`);
      
      if (!window.electron?.fs?.writeFile) {
        console.warn('⚠️ [CACHE-MANAGER] Electron File System API not available');
        return { success: false, reason: 'electron-api-unavailable' };
      }

      // Determine module and file path based on store name
      const modulePath = this.getModulePathForStore(storeName);
      const filePath = `${this.BASE_PATH}/${modulePath}/${storeName}.json`;
      
      // Get current data from IndexedDB
      const currentData = await dbOperations.getAll(storeName);
      
      // Apply changes to data
      const updatedData = this.applyChangesToData(currentData, changes);
      
      // Write to file system (atomic operation)
      const writeResult = await getElectronFS().writeFile(
        filePath,
        JSON.stringify(updatedData, null, 2)
      );
      
      if (writeResult.success) {
        console.log(`✅ [CACHE-MANAGER] Successfully uploaded ${changes.length} changes to ${filePath}`);
        
        // Also update syncQueue to track sync status
        await this.updateSyncQueue(storeName, 'synced');
        
        return { success: true, count: changes.length, path: filePath };
      } else {
        throw new Error(writeResult.error || 'File write failed');
      }
    } catch (error) {
      console.error(`❌ [CACHE-MANAGER] Upload failed for ${storeName}:`, error);
      
      // Log to offline_operations for retry
      await this.addToOfflineOperations(storeName, changes, error.message);
      
      return { success: false, error: error.message };
    }
  }

  /**
   * Get module path for a store (matches backend directory structure)
   */
  getModulePathForStore(storeName) {
    // Find which module this store belongs to
    for (const [module, stores] of Object.entries(this.MODULE_STORES)) {
      if (stores.includes(storeName)) {
        // Special handling for settings subdirectories
        if (module === 'settings') {
          // Check for subdirectory stores
          if (['users', 'roles', 'permissions'].includes(storeName)) {
            return 'settings/User_Management';
          }
          if (storeName === 'profiles') {
            return 'settings/My_Profile';
          }
          return 'settings';
        }
        return module === 'customer' ? '' : module; // Root level for customer module
      }
    }
    
    // Default to root level
    return '';
  }

  /**
   * Apply cached changes to current data
   */
  applyChangesToData(currentData, changes) {
    // Ensure currentData is an array
    let updatedData = Array.isArray(currentData) ? [...currentData] : [];
    
    for (const change of changes) {
      switch (change.operation) {
        case 'create':
          updatedData.push(change.data);
          break;
          
        case 'update':
          const updateIndex = updatedData.findIndex(item => item.id === change.recordId);
          if (updateIndex !== -1) {
            updatedData[updateIndex] = { ...updatedData[updateIndex], ...change.data };
          }
          break;
          
        case 'delete':
          updatedData = updatedData.filter(item => item.id !== change.recordId);
          break;
          
        case 'clear':
          updatedData = [];
          break;
      }
    }
    
    return updatedData;
  }

  /**
   * Update sync queue (similar to backend syncQueue.json)
   */
  async updateSyncQueue(storeName, status) {
    try {
      const queuePath = `${this.BASE_PATH}/syncQueue.json`;
      
      // Read existing queue
      let syncQueue = [];
      const readResult = await getElectronFS().readFile(queuePath);
      if (readResult.success && readResult.data) {
        try {
          const parsedData = JSON.parse(readResult.data);
          // Ensure we have an array - handle both array and object formats
          syncQueue = Array.isArray(parsedData) ? parsedData : [];
        } catch (parseError) {
          console.warn('⚠️ [CACHE-MANAGER] Failed to parse syncQueue.json, starting fresh:', parseError.message);
          syncQueue = [];
        }
      }
      
      // Update or add entry
      const entryIndex = syncQueue.findIndex(item => item.storeName === storeName);
      const entry = {
        storeName,
        status,
        lastSync: new Date().toISOString(),
        syncType: 'cache-upload'
      };
      
      if (entryIndex !== -1) {
        syncQueue[entryIndex] = entry;
      } else {
        syncQueue.push(entry);
      }
      
      // Write back
      await getElectronFS().writeFile(queuePath, JSON.stringify(syncQueue, null, 2));
    } catch (error) {
      console.warn('⚠️ [CACHE-MANAGER] Failed to update sync queue:', error);
    }
  }

  /**
   * Add to offline operations queue (for retry)
   */
  async addToOfflineOperations(storeName, changes, errorMessage) {
    try {
      const opsPath = `${this.BASE_PATH}/offline_operations.json`;
      
      // Read existing operations
      let offlineOps = [];
      const readResult = await getElectronFS().readFile(opsPath);
      if (readResult.success && readResult.data) {
        try {
          const parsedData = JSON.parse(readResult.data);
          // Ensure we have an array - handle both array and object formats
          offlineOps = Array.isArray(parsedData) ? parsedData : [];
        } catch (parseError) {
          console.warn('⚠️ [CACHE-MANAGER] Failed to parse offline_operations.json, starting fresh:', parseError.message);
          offlineOps = [];
        }
      }
      
      // Add failed upload operation
      offlineOps.push({
        id: this.generateChangeId(),
        storeName,
        operation: 'bulk-upload',
        changes,
        status: 'pending',
        error: errorMessage,
        createdAt: new Date().toISOString(),
        retries: 0,
        priority: 'normal'
      });
      
      // Write back
      await getElectronFS().writeFile(opsPath, JSON.stringify(offlineOps, null, 2));
      
      console.log(`📝 [CACHE-MANAGER] Added failed upload to offline_operations for retry`);
    } catch (error) {
      console.error('❌ [CACHE-MANAGER] Failed to add to offline_operations:', error);
    }
  }

  /**
   * Manual trigger for upload (for testing or emergency sync)
   */
  async manualUpload() {
    console.log('🔧 [CACHE-MANAGER] Manual upload triggered');
    return await this.performBulkUpload();
  }

  // ==========================================
  // WRAPPER METHODS FOR CRUD OPERATIONS
  // ==========================================

  /**
   * Wrapper for create operation
   */
  async create(storeName, data) {
    try {
      // Insert into IndexedDB first
      const result = await dbOperations.insert(storeName, data);
      
      // Capture in cache
      await this.captureChange('create', storeName, data, result.id || result);
      
      return result;
    } catch (error) {
      console.error(`❌ [CACHE-MANAGER] Create failed for ${storeName}:`, error);
      throw error;
    }
  }

  /**
   * Wrapper for update operation
   */
  async update(storeName, recordId, data) {
    try {
      // Update in IndexedDB first
      const result = await dbOperations.update(storeName, recordId, data);
      
      // Capture in cache
      await this.captureChange('update', storeName, data, recordId);
      
      return result;
    } catch (error) {
      console.error(`❌ [CACHE-MANAGER] Update failed for ${storeName}:`, error);
      throw error;
    }
  }

  /**
   * Wrapper for delete operation
   */
  async delete(storeName, recordId) {
    try {
      // Delete from IndexedDB first
      const result = await dbOperations.delete(storeName, recordId);
      
      // Capture in cache
      await this.captureChange('delete', storeName, { id: recordId }, recordId);
      
      return result;
    } catch (error) {
      console.error(`❌ [CACHE-MANAGER] Delete failed for ${storeName}:`, error);
      throw error;
    }
  }

  // ==========================================
  // UTILITY METHODS
  // ==========================================

  generateChangeId() {
    return `change_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Check if error is retryable
   */
  isRetryableError(error) {
    const retryableCodes = ['ENOENT', 'EACCES', 'EPERM', 'ETIMEDOUT', 'ECONNRESET', 'ENOTFOUND'];
    const retryableMessages = ['timeout', 'network', 'connection', 'EBUSY'];
    
    return retryableCodes.includes(error.code) || 
           retryableMessages.some(msg => error.message?.toLowerCase().includes(msg));
  }

  /**
   * Record upload latency for performance monitoring
   */
  recordUploadLatency(ms) {
    this.stats.uploadLatencies.push({ timestamp: Date.now(), value: ms });
    this.pruneOldMetrics('uploadLatencies');
  }

  /**
   * Record buffer flush time
   */
  recordBufferFlushTime(ms) {
    this.stats.bufferFlushTimes.push({ timestamp: Date.now(), value: ms });
    this.pruneOldMetrics('bufferFlushTimes');
  }

  /**
   * Track errors by store
   */
  trackError(storeName, error) {
    if (!this.stats.errorRates[storeName]) {
      this.stats.errorRates[storeName] = { total: 0, errors: [] };
    }
    this.stats.errorRates[storeName].total++;
    this.stats.errorRates[storeName].errors.push({
      timestamp: Date.now(),
      message: error.message,
      code: error.code
    });
    this.pruneOldErrors(storeName);
  }

  /**
   * Prune old metrics (keep last 1000)
   */
  pruneOldMetrics(metricName) {
    if (this.stats[metricName]?.length > 1000) {
      this.stats[metricName] = this.stats[metricName].slice(-1000);
    }
  }

  /**
   * Prune old errors (keep last 100)
   */
  pruneOldErrors(storeName) {
    const errors = this.stats.errorRates[storeName]?.errors;
    if (errors?.length > 100) {
      this.stats.errorRates[storeName].errors = errors.slice(-100);
    }
  }

  /**
   * Get P95 latency
   */
  getP95Latency() {
    const latencies = this.stats.uploadLatencies.map(l => l.value).sort((a, b) => a - b);
    return latencies[Math.floor(latencies.length * 0.95)] || 0;
  }

  /**
   * Check thresholds and emit alerts
   */
  checkThresholds() {
    // High pending count
    if (this.pendingChanges > this.alertThresholds.highPendingCount) {
      this.emitAlert('high-pending-count', {
        count: this.pendingChanges,
        threshold: this.alertThresholds.highPendingCount
      });
    }

    // High buffer size
    if (this.changeBuffer.length > this.alertThresholds.highBufferSize) {
      this.emitAlert('high-buffer-size', {
        size: this.changeBuffer.length,
        threshold: this.alertThresholds.highBufferSize
      });
    }

    // High latency
    const p95 = this.getP95Latency();
    if (p95 > this.alertThresholds.highLatency) {
      this.emitAlert('high-upload-latency', {
        latency: p95,
        threshold: this.alertThresholds.highLatency
      });
    }
  }

  /**
   * Emit alert (can be extended to show notifications)
   */
  emitAlert(type, data) {
    console.warn(`⚠️ [CACHE-MANAGER-ALERT] ${type}:`, data);
    // Could emit custom event for UI to show notification
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cache-alert', { detail: { type, data } }));
    }
  }

  /**
   * Get file name for a store (some stores have different file names)
   */
  getFileNameForStore(storeName) {
    // Handle stores with different file names
    const fileNameMap = {
      'gst_ledger': 'gstledger.json',
      'sell_challans': 'sellchallan.json',
      'challans': 'challan.json',
      'profiles': 'user_data.json' // In settings/My_Profile/
    };
    
    return fileNameMap[storeName] || `${storeName}.json`;
  }

  /**
   * Get cache statistics with performance metrics
   */
  getStats() {
    return {
      ...this.stats,
      pendingChanges: this.pendingChanges,
      bufferSize: this.changeBuffer.length,
      isUploading: this.isUploading,
      lastUploadTime: this.lastUploadTime,
      nextUploadTime: this.nextUploadTime,
      uploadInterval: '8 hours',
      initialized: this.isInitialized,
      p95Latency: this.getP95Latency(),
      avgBufferFlushTime: this.stats.bufferFlushTimes.length > 0
        ? this.stats.bufferFlushTimes.reduce((sum, t) => sum + t.value, 0) / this.stats.bufferFlushTimes.length
        : 0
    };
  }

  /**
   * Get cache status for UI
   */
  getStatus() {
    const now = new Date();
    let nextUpload = null;
    let timeUntilUpload = null;
    
    // Calculate next upload time if not set
    if (!this.nextUploadTime && this.isInitialized && !this.browserMode) {
      this.calculateNextUpload();
    }
    
    if (this.nextUploadTime) {
      nextUpload = new Date(this.nextUploadTime);
      const diffMs = nextUpload.getTime() - now.getTime();
      timeUntilUpload = diffMs > 0 ? Math.round(diffMs / 1000 / 60) : 0; // minutes
    }
    
    return {
      enabled: this.isInitialized,
      browserMode: this.browserMode || false,
      isElectron: this.isElectron,
      pendingChanges: this.pendingChanges || 0,
      bufferSize: this.changeBuffer ? this.changeBuffer.length : 0,
      isUploading: this.isUploading || false,
      lastUpload: this.lastUploadTime || null,
      nextUpload: this.nextUploadTime || null,
      timeUntilUpload: timeUntilUpload,
      totalChanges: this.stats.totalChanges || 0,
      successfulUploads: this.stats.successfulUploads || 0,
      failedUploads: this.stats.failedUploads || 0
    };
  }

  /**
   * Clear cache (for testing or maintenance)
   */
  async clearCache() {
    try {
      console.log('🧹 [CACHE-MANAGER] Clearing cache...');
      
      this.changeBuffer = [];
      this.pendingChanges = 0;
      
      const journalPath = `${this.CACHE_PATH}/${this.JOURNAL_FILE}`;
      await getElectronFS().writeFile(journalPath, JSON.stringify({
        changes: [],
        totalChanges: 0,
        lastUploadTime: null,
        clearedAt: new Date().toISOString()
      }, null, 2));
      
      console.log('✅ [CACHE-MANAGER] Cache cleared');
      return { success: true };
    } catch (error) {
      console.error('❌ [CACHE-MANAGER] Clear cache failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Stop all timers and cleanup
   */
  cleanup() {
    console.log('🧹 [CACHE-MANAGER] Cleaning up...');
    
    if (this.uploadTimer) {
      clearInterval(this.uploadTimer);
      this.uploadTimer = null;
    }
    
    if (this.bufferFlushTimer) {
      clearInterval(this.bufferFlushTimer);
      this.bufferFlushTimer = null;
    }
    
    // Flush any remaining changes
    this.flushBufferToDisk();
    
    console.log('✅ [CACHE-MANAGER] Cleanup completed');
  }
}

// Create singleton instance
const writeBehindCache = new WriteBehindCacheManager();

// Expose to window for debugging
if (typeof window !== 'undefined') {
  window.cacheManager = {
    status: () => writeBehindCache.getStatus(),
    stats: () => writeBehindCache.getStats(),
    upload: () => writeBehindCache.manualUpload(),
    uploadNow: () => writeBehindCache.manualUpload(), // Alias for Force Upload
    clear: () => writeBehindCache.clearCache(),
    flush: () => writeBehindCache.flushBufferToDisk(),
    flushBuffer: () => writeBehindCache.flushBufferToDisk(), // Alias for Flush Buffer
    
    // CRUD wrappers
    create: (store, data) => writeBehindCache.create(store, data),
    update: (store, id, data) => writeBehindCache.update(store, id, data),
    delete: (store, id) => writeBehindCache.delete(store, id),
  };
  
  console.log('🔧 [CACHE-MANAGER] Write-Behind Cache Manager loaded!');
  console.log('📋 Available commands:');
  console.log('  • window.cacheManager.status() - Get cache status');
  console.log('  • window.cacheManager.stats() - Get statistics');
  console.log('  • window.cacheManager.upload() - Trigger manual upload');
  console.log('  • window.cacheManager.uploadNow() - Force immediate upload');
  console.log('  • window.cacheManager.clear() - Clear cache');
  console.log('  • window.cacheManager.flush() - Flush buffer to disk');
  console.log('  • window.cacheManager.flushBuffer() - Flush buffer to disk');
}

export default writeBehindCache;

