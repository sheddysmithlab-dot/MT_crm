import { initDB } from '@/lib/db';

export const checkDatabaseHealth = async () => {
  const report = {
    isHealthy: true,
    issues: [],
    stores: {},
    version: null
  };

  try {
    const db = await initDB();
    report.version = db.version;
    
    const requiredStores = [
      'purchase_challans',
      'purchase_challan_items',
      'sell_challan_items',
      'suppliers',
      'inventory_categories',
      'inventory_items',
      'stock_movements',
      'vouchers',
      'supplier_ledger_entries',
      'rate_history'
    ];

    // Check each required store
    requiredStores.forEach(storeName => {
      const exists = db.objectStoreNames.contains(storeName);
      report.stores[storeName] = exists;
      
      if (!exists) {
        report.isHealthy = false;
        report.issues.push(`Missing object store: ${storeName}`);
      }
    });

    // List all stores
    console.log('📊 Database Health Report:');
    console.log(`Version: ${report.version}`);
    console.log(`Total stores: ${db.objectStoreNames.length}`);
    console.log('Available stores:', Array.from(db.objectStoreNames));
    console.log('Health status:', report.isHealthy ? '✅ Healthy' : '❌ Issues Found');
    
    if (report.issues.length > 0) {
      console.error('Issues:', report.issues);
    }

    return report;
  } catch (error) {
    report.isHealthy = false;
    report.issues.push(`Database initialization error: ${error.message}`);
    console.error('❌ Database health check failed:', error);
    return report;
  }
};

export const repairDatabase = async () => {
  console.log('🔧 Starting database repair...');
  
  try {
    // Close any existing connections
    const dbName = 'malwa_crm_db';
    
    // Delete and recreate database
    await new Promise((resolve, reject) => {
      const deleteRequest = indexedDB.deleteDatabase(dbName);
      
      deleteRequest.onsuccess = () => {
        console.log('✅ Old database deleted');
        resolve();
      };
      
      deleteRequest.onerror = () => {
        console.error('❌ Failed to delete database');
        reject(new Error('Failed to delete database'));
      };
      
      deleteRequest.onblocked = () => {
        console.warn('⚠️ Database deletion blocked - please close all tabs');
        reject(new Error('Database deletion blocked'));
      };
    });

    // Reinitialize database
    await initDB();
    console.log('✅ Database recreated successfully');
    
    // Verify health
    const health = await checkDatabaseHealth();
    return health;
    
  } catch (error) {
    console.error('❌ Database repair failed:', error);
    throw error;
  }
};
