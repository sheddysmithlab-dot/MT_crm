/**
 * Offline Database Manager
 * Creates separate IndexedDB databases for each CRM module
 * Manages backup/restore to C:/malwa-crm/Data_base/ folder
 */

// Database configurations for each CRM module
const DATABASE_CONFIGS = {
  customers: {
    name: 'MalwaCRM_Customers',
    version: 1,
    stores: {
      customers: { keyPath: 'id', indexes: ['name', 'phone', 'email', 'created_at', 'updated_at'] },
      contacts: { keyPath: 'id', indexes: ['customer_id', 'name', 'phone'] },
      addresses: { keyPath: 'id', indexes: ['customer_id', 'type'] },
      vehicles: { keyPath: 'id', indexes: ['customer_id', 'vehicle_no', 'model'] }
    }
  },

  sales: {
    name: 'MalwaCRM_Sales',
    version: 1,
    stores: {
      invoices: { keyPath: 'id', indexes: ['customer_id', 'invoice_no', 'date', 'status', 'total_amount'] },
      estimates: { keyPath: 'id', indexes: ['customer_id', 'estimate_no', 'date', 'status'] },
      chalans: { keyPath: 'id', indexes: ['customer_id', 'chalan_no', 'date'] },
      payments: { keyPath: 'id', indexes: ['customer_id', 'invoice_id', 'date', 'amount', 'method'] }
    }
  },

  inventory: {
    name: 'MalwaCRM_Inventory',
    version: 1,
    stores: {
      items: { keyPath: 'id', indexes: ['name', 'sku', 'category', 'quantity', 'price'] },
      categories: { keyPath: 'id', indexes: ['name', 'parent_id'] },
      stock_movements: { keyPath: 'id', indexes: ['item_id', 'type', 'date', 'quantity'] },
      suppliers: { keyPath: 'id', indexes: ['name', 'phone', 'email'] }
    }
  },

  jobs: {
    name: 'MalwaCRM_Jobs',
    version: 1,
    stores: {
      jobs: { keyPath: 'id', indexes: ['customer_id', 'vehicle_no', 'status', 'created_at'] },
      inspections: { keyPath: 'id', indexes: ['job_id', 'date', 'status'] },
      job_sheets: { keyPath: 'id', indexes: ['job_id', 'date'] },
      job_parts: { keyPath: 'id', indexes: ['job_id', 'item_id', 'quantity'] },
      job_labour: { keyPath: 'id', indexes: ['job_id', 'labour_id', 'hours'] }
    }
  },

  employees: {
    name: 'MalwaCRM_Employees',
    version: 1,
    stores: {
      employees: { keyPath: 'id', indexes: ['name', 'role', 'phone', 'email', 'status'] },
      labour: { keyPath: 'id', indexes: ['name', 'phone', 'skill_type', 'rate'] },
      attendance: { keyPath: 'id', indexes: ['employee_id', 'date', 'status'] },
      payroll: { keyPath: 'id', indexes: ['employee_id', 'month', 'year', 'amount'] }
    }
  },

  vendors: {
    name: 'MalwaCRM_Vendors',
    version: 1,
    stores: {
      vendors: { keyPath: 'id', indexes: ['name', 'phone', 'email', 'type'] },
      purchases: { keyPath: 'id', indexes: ['vendor_id', 'purchase_no', 'date', 'amount'] },
      vendor_payments: { keyPath: 'id', indexes: ['vendor_id', 'date', 'amount', 'method'] }
    }
  },

  ledger: {
    name: 'MalwaCRM_Ledger',
    version: 1,
    stores: {
      ledger_entries: { keyPath: 'id', indexes: ['entity_type', 'entity_id', 'date', 'type', 'amount'] },
      cash_receipts: { keyPath: 'id', indexes: ['customer_id', 'date', 'amount'] },
      vouchers: { keyPath: 'id', indexes: ['type', 'date', 'amount'] },
      gst_records: { keyPath: 'id', indexes: ['invoice_id', 'date', 'gst_amount'] }
    }
  },

  reports: {
    name: 'MalwaCRM_Reports',
    version: 1,
    stores: {
      saved_reports: { keyPath: 'id', indexes: ['type', 'date', 'created_by'] },
      report_templates: { keyPath: 'id', indexes: ['name', 'type'] },
      export_history: { keyPath: 'id', indexes: ['date', 'type', 'format'] }
    }
  },

  settings: {
    name: 'MalwaCRM_Settings',
    version: 1,
    stores: {
      companies: { keyPath: 'id', indexes: ['name'] },
      users: { keyPath: 'id', indexes: ['email', 'username', 'role'] },
      app_settings: { keyPath: 'id', indexes: ['key', 'category'] },
      multipliers: { keyPath: 'id', indexes: ['category', 'name'] },
      branches: { keyPath: 'id', indexes: ['name', 'code'] }
    }
  },

  system: {
    name: 'MalwaCRM_System',
    version: 1,
    stores: {
      sync_queue: { keyPath: 'id', indexes: ['status', 'timestamp', 'operation'] },
      backup_history: { keyPath: 'id', indexes: ['date', 'status', 'type'] },
      audit_logs: { keyPath: 'id', indexes: ['user_id', 'action', 'timestamp', 'entity_type'] },
      sessions: { keyPath: 'id', indexes: ['user_id', 'created_at', 'expires_at'] }
    }
  }
};

class OfflineDatabaseManager {
  constructor() {
    this.databases = new Map();
    this.isInitialized = false;
    this.backupPath = 'C:/malwa-crm/Data_base/'; // Updated to match sync manager path
    this.autoBackupInterval = null;
  }

  /**
   * Initialize all module databases
   */
  async initializeAll() {
    if (this.isInitialized) {
      return;
    }

    console.log('🚀 Initializing Malwa CRM Offline Databases...');

    const promises = Object.entries(DATABASE_CONFIGS).map(([module, config]) =>
      this.initializeDatabase(module, config)
    );

    await Promise.all(promises);
    this.isInitialized = true;

    console.log('✅ All databases initialized successfully');

    // Log database structure
    this.logDatabaseStructure();
  }

  /**
   * Initialize a single database
   */
  async initializeDatabase(moduleName, config) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(config.name, config.version);

      request.onerror = () => {
        console.error(`❌ Failed to open ${config.name}:`, request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        const db = request.result;
        this.databases.set(moduleName, db);
        console.log(`✅ ${config.name} opened successfully`);
        resolve(db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        console.log(`🔧 Creating stores for ${config.name}...`);

        Object.entries(config.stores).forEach(([storeName, storeConfig]) => {
          if (!db.objectStoreNames.contains(storeName)) {
            const objectStore = db.createObjectStore(storeName, {
              keyPath: storeConfig.keyPath,
              autoIncrement: false
            });

            // Create indexes
            storeConfig.indexes.forEach(indexName => {
              objectStore.createIndex(indexName, indexName, { unique: false });
            });

            console.log(`   📦 Created store: ${storeName} with ${storeConfig.indexes.length} indexes`);
          }
        });
      };
    });
  }

  /**
   * Get database by module name
   */
  getDatabase(moduleName) {
    const db = this.databases.get(moduleName);
    if (!db) {
      throw new Error(`Database for module "${moduleName}" not found. Did you call initializeAll()?`);
    }
    return db;
  }

  /**
   * Add data to a specific store in a module
   */
  async add(moduleName, storeName, data) {
    const db = this.getDatabase(moduleName);

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const objectStore = transaction.objectStore(storeName);

      const dataWithTimestamp = {
        ...data,
        created_at: data.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const request = objectStore.add(dataWithTimestamp);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Update data in a specific store
   */
  async put(moduleName, storeName, data) {
    const db = this.getDatabase(moduleName);

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const objectStore = transaction.objectStore(storeName);

      const dataWithTimestamp = {
        ...data,
        updated_at: new Date().toISOString()
      };

      const request = objectStore.put(dataWithTimestamp);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all data from a store
   */
  async getAll(moduleName, storeName) {
    const db = this.getDatabase(moduleName);

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly');
      const objectStore = transaction.objectStore(storeName);
      const request = objectStore.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get by ID
   */
  async getById(moduleName, storeName, id) {
    const db = this.getDatabase(moduleName);

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly');
      const objectStore = transaction.objectStore(storeName);
      const request = objectStore.get(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete by ID
   */
  async delete(moduleName, storeName, id) {
    const db = this.getDatabase(moduleName);

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const objectStore = transaction.objectStore(storeName);
      const request = objectStore.delete(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear all data from a store
   */
  async clear(moduleName, storeName) {
    const db = this.getDatabase(moduleName);

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const objectStore = transaction.objectStore(storeName);
      const request = objectStore.clear();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get by index
   */
  async getByIndex(moduleName, storeName, indexName, value) {
    const db = this.getDatabase(moduleName);

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly');
      const objectStore = transaction.objectStore(storeName);
      const index = objectStore.index(indexName);
      const request = index.getAll(value);

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Export entire database to JSON
   */
  async exportDatabase(moduleName) {
    const config = DATABASE_CONFIGS[moduleName];
    if (!config) {
      throw new Error(`Unknown module: ${moduleName}`);
    }

    const exportData = {
      module: moduleName,
      database: config.name,
      version: config.version,
      exportDate: new Date().toISOString(),
      stores: {}
    };

    // Export all stores
    for (const storeName of Object.keys(config.stores)) {
      const data = await this.getAll(moduleName, storeName);
      exportData.stores[storeName] = data;
    }

    return exportData;
  }

  /**
   * Export all databases to JSON
   */
  async exportAllDatabases() {
    const exports = {};

    for (const moduleName of Object.keys(DATABASE_CONFIGS)) {
      try {
        exports[moduleName] = await this.exportDatabase(moduleName);
        console.log(`✅ Exported ${moduleName} database`);
      } catch (error) {
        console.error(`❌ Failed to export ${moduleName}:`, error);
      }
    }

    return exports;
  }

  /**
   * Import database from JSON
   */
  async importDatabase(moduleName, importData) {
    const config = DATABASE_CONFIGS[moduleName];
    if (!config) {
      throw new Error(`Unknown module: ${moduleName}`);
    }

    console.log(`📥 Importing ${moduleName} database...`);

    // Import all stores
    for (const [storeName, data] of Object.entries(importData.stores)) {
      if (Array.isArray(data) && data.length > 0) {
        // Clear existing data
        await this.clear(moduleName, storeName);

        // Import new data
        for (const item of data) {
          await this.put(moduleName, storeName, item);
        }

        console.log(`   ✅ Imported ${data.length} records to ${storeName}`);
      }
    }

    console.log(`✅ ${moduleName} database imported successfully`);
  }

  /**
   * Save database to file (Electron only)
   */
  async saveToFile(moduleName, data) {
    const config = DATABASE_CONFIGS[moduleName];
    const fileName = `${config.name}_backup.json`;
    const filePath = `${this.backupPath}${fileName}`;

    // In Electron environment
    if (window.electron && window.electron.fs) {
      try {
        await window.electron.fs.writeFile(filePath, JSON.stringify(data, null, 2));
        console.log(`💾 Saved ${fileName} to ${filePath}`);

        // Log to backup history
        await this.logBackup(moduleName, 'success', filePath);

        return { success: true, path: filePath };
      } catch (error) {
        console.error(`❌ Failed to save ${fileName}:`, error);
        await this.logBackup(moduleName, 'failed', filePath, error.message);
        return { success: false, error: error.message };
      }
    } else {
      // Browser fallback - download as file
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log(`💾 Downloaded ${fileName}`);
      return { success: true, path: 'Downloads folder' };
    }
  }

  /**
   * Load database from file (Electron only)
   */
  async loadFromFile(moduleName) {
    const config = DATABASE_CONFIGS[moduleName];
    const fileName = `${config.name}_backup.json`;
    const filePath = `${this.backupPath}${fileName}`;

    if (window.electron && window.electron.fs) {
      try {
        const fileContent = await window.electron.fs.readFile(filePath);
        const data = JSON.parse(fileContent);

        await this.importDatabase(moduleName, data);

        console.log(`📂 Loaded ${fileName} from ${filePath}`);
        return { success: true, path: filePath };
      } catch (error) {
        console.error(`❌ Failed to load ${fileName}:`, error);
        return { success: false, error: error.message };
      }
    } else {
      console.warn('File system access not available - use file input');
      return { success: false, error: 'Not in Electron environment' };
    }
  }

  /**
   * Backup single database to file
   */
  async backupDatabase(moduleName) {
    console.log(`📦 Backing up ${moduleName} database...`);

    const exportData = await this.exportDatabase(moduleName);
    const result = await this.saveToFile(moduleName, exportData);

    return result;
  }

  /**
   * Backup all databases to files
   */
  async backupAllDatabases() {
    console.log('📦 Starting full backup of all databases...');

    const results = {};

    for (const moduleName of Object.keys(DATABASE_CONFIGS)) {
      results[moduleName] = await this.backupDatabase(moduleName);
    }

    console.log('✅ Full backup completed');
    return results;
  }

  /**
   * Restore single database from file
   */
  async restoreDatabase(moduleName) {
    console.log(`📂 Restoring ${moduleName} database...`);

    const result = await this.loadFromFile(moduleName);
    return result;
  }

  /**
   * Restore all databases from files
   */
  async restoreAllDatabases() {
    console.log('📂 Starting full restore of all databases...');

    const results = {};

    for (const moduleName of Object.keys(DATABASE_CONFIGS)) {
      results[moduleName] = await this.restoreDatabase(moduleName);
    }

    console.log('✅ Full restore completed');
    return results;
  }

  /**
   * Log backup operation to system database
   */
  async logBackup(moduleName, status, filePath, errorMessage = null) {
    try {
      const logEntry = {
        id: `backup_${Date.now()}_${moduleName}`,
        module: moduleName,
        date: new Date().toISOString(),
        status: status,
        file_path: filePath,
        error_message: errorMessage
      };

      await this.add('system', 'backup_history', logEntry);
    } catch (error) {
      console.error('Failed to log backup:', error);
    }
  }

  /**
   * Setup automatic backup scheduler
   */
  startAutoBackup(intervalHours = 24) {
    if (this.autoBackupInterval) {
      clearInterval(this.autoBackupInterval);
    }

    const intervalMs = intervalHours * 60 * 60 * 1000;

    this.autoBackupInterval = setInterval(async () => {
      console.log('⏰ Auto-backup triggered');
      await this.backupAllDatabases();
    }, intervalMs);

    console.log(`⏰ Auto-backup scheduled every ${intervalHours} hours`);
  }

  /**
   * Stop automatic backup
   */
  stopAutoBackup() {
    if (this.autoBackupInterval) {
      clearInterval(this.autoBackupInterval);
      this.autoBackupInterval = null;
      console.log('⏰ Auto-backup stopped');
    }
  }

  /**
   * Log database structure
   */
  logDatabaseStructure() {
    console.log('\n📊 DATABASE STRUCTURE:');
    console.log('=====================================================');

    Object.entries(DATABASE_CONFIGS).forEach(([module, config]) => {
      console.log(`\n📁 ${module.toUpperCase()} (${config.name})`);
      Object.entries(config.stores).forEach(([storeName, storeConfig]) => {
        console.log(`   📦 ${storeName}`);
        console.log(`      🔑 Key: ${storeConfig.keyPath}`);
        console.log(`      📇 Indexes: ${storeConfig.indexes.join(', ')}`);
      });
    });

    console.log('\n=====================================================');
    console.log('💾 Backup Path: C:/malwa-crm/Data_base/');
    console.log('=====================================================\n');
  }

  /**
   * Get database statistics
   */
  async getStatistics() {
    const stats = {};

    for (const [moduleName, config] of Object.entries(DATABASE_CONFIGS)) {
      stats[moduleName] = {
        database: config.name,
        stores: {}
      };

      for (const storeName of Object.keys(config.stores)) {
        const data = await this.getAll(moduleName, storeName);
        stats[moduleName].stores[storeName] = {
          count: data.length,
          size: JSON.stringify(data).length
        };
      }
    }

    return stats;
  }

  /**
   * Delete all databases (use with caution!)
   */
  async deleteAllDatabases() {
    console.warn('⚠️  Deleting all databases...');

    const promises = Object.values(DATABASE_CONFIGS).map(config => {
      return new Promise((resolve, reject) => {
        const request = indexedDB.deleteDatabase(config.name);
        request.onsuccess = () => {
          console.log(`🗑️  Deleted ${config.name}`);
          resolve();
        };
        request.onerror = () => reject(request.error);
      });
    });

    await Promise.all(promises);
    this.databases.clear();
    this.isInitialized = false;

    console.log('✅ All databases deleted');
  }
}

// Create singleton instance
const offlineDB = new OfflineDatabaseManager();

// Export for use
export { offlineDB, DATABASE_CONFIGS };
export default offlineDB;
