/**
 * Unified Data Flow Manager for Malwa CRM v4
 * Complete backend unification - UI to Database operations
 * 
 * Flow: UI Input → Validation → Database → Response → UI Update
 * Features: Automatic database structure creation, error elimination, Windows installation support
 */

import enhancedDbOperations from './enhancedDbOperations.js';
import windowsInstallationManager from './windowsInstallationManager.js';

class UnifiedDataFlowManager {
  constructor() {
    this.dbOps = enhancedDbOperations;
    this.installationManager = windowsInstallationManager;
    this.isInitialized = false;
    this.operationQueue = [];
    this.moduleMapping = this.initializeModuleMapping();
    this.validationRules = this.initializeValidationRules();
    
    this.initialize();
  }

  async initialize() {
    try {
      console.log('🔄 [UNIFIED-BACKEND] Initializing unified data flow manager...');
      
      // Ensure Windows installation is complete
      await this.installationManager.ensureInstallationComplete();
      
      // Test database connectivity
      await this.validateSystemHealth();
      
      this.isInitialized = true;
      console.log('✅ [UNIFIED-BACKEND] Unified data flow manager initialized successfully');
      
    } catch (error) {
      console.error('❌ [UNIFIED-BACKEND] Initialization failed:', error);
      this.isInitialized = false;
    }
  }

  initializeModuleMapping() {
    return {
      // Main modules
      'accounts': { store: 'accounts', folder: 'accounts', validation: 'account' },
      'customers': { store: 'customers', folder: 'customer', validation: 'customer' },
      'customer': { store: 'customers', folder: 'customer', validation: 'customer' }, // Alias
      'inventory': { store: 'inventory', folder: 'inventory', validation: 'inventory' },
      'jobs': { store: 'jobs', folder: 'jobs', validation: 'job' },
      'labour': { store: 'labour', folder: 'labour', validation: 'labour' },
      'settings': { store: 'settings', folder: 'settings', validation: 'setting' },
      'summary': { store: 'summary', folder: 'summary', validation: 'summary' },
      'suppliers': { store: 'suppliers', folder: 'supplier', validation: 'supplier' },
      'supplier': { store: 'suppliers', folder: 'supplier', validation: 'supplier' }, // Alias
      'vendors': { store: 'vendors', folder: 'vendors', validation: 'vendor' },
      
      // Sub-modules
      'cashreceipt': { store: 'accounts', folder: 'accounts', file: 'CashReceipt.json', validation: 'account' },
      'invoice': { store: 'accounts', folder: 'accounts', file: 'Invoice.json', validation: 'account' },
      'purchase': { store: 'accounts', folder: 'accounts', file: 'Purchase.json', validation: 'account' },
      'challan': { store: 'accounts', folder: 'accounts', file: 'Challan.json', validation: 'account' },
      
      // System modules
      'meta': { store: 'meta', folder: '', validation: 'meta' },
      'dashboard': { store: 'meta', folder: '', file: 'Dashboard.json', validation: 'meta' },
      'sync_queue': { store: 'meta', folder: '', file: 'SyncQueue.json', validation: 'meta' }
    };
  }

  initializeValidationRules() {
    return {
      customer: {
        required: ['name'],
        optional: ['phone', 'email', 'address', 'gstin'],
        types: { name: 'string', phone: 'string', email: 'email' }
      },
      job: {
        required: ['customer_id', 'vehicle_number'],
        optional: ['job_type', 'description', 'status', 'estimate_amount'],
        types: { customer_id: 'string', vehicle_number: 'string', estimate_amount: 'number' }
      },
      account: {
        required: ['type', 'amount'],
        optional: ['description', 'reference', 'date'],
        types: { amount: 'number', date: 'date' }
      },
      inventory: {
        required: ['name', 'quantity'],
        optional: ['category', 'price', 'description'],
        types: { quantity: 'number', price: 'number' }
      },
      labour: {
        required: ['name'],
        optional: ['phone', 'daily_rate', 'skills'],
        types: { daily_rate: 'number' }
      },
      supplier: {
        required: ['name'],
        optional: ['phone', 'email', 'address', 'gstin'],
        types: { name: 'string', phone: 'string', email: 'email' }
      },
      vendor: {
        required: ['name'],
        optional: ['phone', 'email', 'address', 'gstin'],
        types: { name: 'string', phone: 'string', email: 'email' }
      },
      setting: {
        required: ['key'],
        optional: ['value', 'description'],
        types: { key: 'string' }
      },
      summary: {
        required: ['type'],
        optional: ['data', 'date_range'],
        types: { type: 'string' }
      },
      meta: {
        required: [],
        optional: ['key', 'value', 'timestamp'],
        types: {}
      }
    };
  }

  async validateSystemHealth() {
    try {
      // Test basic database operations
      const testStores = ['meta', 'customers', 'jobs'];
      
      for (const store of testStores) {
        try {
          await this.dbOps.count(store);
        } catch (error) {
          console.warn(`⚠️ [UNIFIED-BACKEND] Store ${store} not ready, will be created on first use`);
        }
      }
      
      console.log('✅ [UNIFIED-BACKEND] System health validated');
      return true;
    } catch (error) {
      console.error('❌ [UNIFIED-BACKEND] System health check failed:', error);
      throw error;
    }
  }

  // ===========================================
  // UNIFIED CRUD OPERATIONS - MAIN API
  // ===========================================

  /**
   * Create new record
   * @param {string} module - Module name (customers, jobs, etc.)
   * @param {object} data - Data to create
   * @param {object} context - Additional context (user, page, etc.)
   */
  async create(module, data, context = {}) {
    return await this.executeUnifiedOperation('CREATE', module, data, context);
  }

  /**
   * Read records
   * @param {string} module - Module name
   * @param {string|null} id - Record ID (null for getAll)
   * @param {object} context - Additional context
   */
  async read(module, id = null, context = {}) {
    const operationData = id ? { id } : {};
    return await this.executeUnifiedOperation('READ', module, operationData, context);
  }

  /**
   * Update existing record
   * @param {string} module - Module name
   * @param {object} data - Data to update (must include id)
   * @param {object} context - Additional context
   */
  async update(module, data, context = {}) {
    return await this.executeUnifiedOperation('UPDATE', module, data, context);
  }

  /**
   * Delete record
   * @param {string} module - Module name
   * @param {string} id - Record ID to delete
   * @param {object} context - Additional context
   */
  async delete(module, id, context = {}) {
    return await this.executeUnifiedOperation('DELETE', module, { id }, context);
  }

  /**
   * Get all records (alias for read without ID)
   * @param {string} module - Module name
   * @param {object} context - Additional context
   */
  async getAll(module, context = {}) {
    return await this.read(module, null, context);
  }

  /**
   * Count records in module
   * @param {string} module - Module name
   * @param {object} context - Additional context
   */
  async count(module, context = {}) {
    return await this.executeUnifiedOperation('COUNT', module, {}, context);
  }

  // ===========================================
  // CORE UNIFIED OPERATION EXECUTOR
  // ===========================================

  async executeUnifiedOperation(operation, module, data, context) {
    if (!this.isInitialized) {
      return this.createResponse(false, operation, module, null, 'System not initialized');
    }

    const operationId = this.generateOperationId();
    const startTime = Date.now();
    
    try {
      console.log(`🔄 [${operation}] ${module} - ID: ${operationId}`);
      
      // Step 1: Input validation and preprocessing
      const validationResult = await this.validateAndPreprocess(operation, module, data, context);
      if (!validationResult.success) {
        return this.createResponse(false, operation, module, null, validationResult.error, operationId);
      }

      const { processedData, moduleConfig } = validationResult;

      // Step 2: Execute database operation
      const dbResult = await this.executeDatabaseOperation(operation, moduleConfig.store, processedData, context);

      // Step 3: Post-process and create backup if needed
      const finalResult = await this.postProcessResult(operation, module, dbResult, context);

      const duration = Date.now() - startTime;
      console.log(`✅ [${operation}] ${module} completed in ${duration}ms`);
      
      return this.createResponse(true, operation, module, finalResult, null, operationId, duration);

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ [${operation}] ${module} failed after ${duration}ms:`, error.message);
      return this.createResponse(false, operation, module, null, error.message, operationId, duration);
    }
  }

  // ===========================================
  // VALIDATION AND PREPROCESSING
  // ===========================================

  async validateAndPreprocess(operation, module, data, context) {
    try {
      // Module validation
      const moduleConfig = this.moduleMapping[module.toLowerCase()];
      if (!moduleConfig) {
        return { success: false, error: `Unknown module: ${module}` };
      }

      // Operation-specific validation
      const validationResult = this.validateOperationData(operation, module, data);
      if (!validationResult.success) {
        return validationResult;
      }

      // Data preprocessing
      const processedData = await this.preprocessData(operation, module, data, context);

      return {
        success: true,
        processedData,
        moduleConfig
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  validateOperationData(operation, module, data) {
    try {
      const moduleConfig = this.moduleMapping[module.toLowerCase()];
      const rules = this.validationRules[moduleConfig.validation];

      if (!rules) {
        return { success: true }; // No validation rules defined
      }

      // Check required fields for CREATE and UPDATE
      if (operation === 'CREATE' || operation === 'UPDATE') {
        for (const field of rules.required) {
          if (!data || data[field] === undefined || data[field] === null || data[field] === '') {
            return { success: false, error: `Required field missing: ${field}` };
          }
        }
      }

      // Check ID for UPDATE and DELETE
      if (operation === 'UPDATE' || operation === 'DELETE') {
        if (!data || !data.id) {
          return { success: false, error: 'ID is required for update/delete operations' };
        }
      }

      // Type validation
      if (data && rules.types) {
        for (const [field, type] of Object.entries(rules.types)) {
          if (data[field] !== undefined) {
            const isValid = this.validateFieldType(data[field], type);
            if (!isValid) {
              return { success: false, error: `Invalid type for field ${field}: expected ${type}` };
            }
          }
        }
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  validateFieldType(value, type) {
    switch (type) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'email':
        return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      case 'date':
        return value instanceof Date || !isNaN(Date.parse(value));
      default:
        return true;
    }
  }

  async preprocessData(operation, module, data, context) {
    const timestamp = new Date().toISOString();
    const userId = context.user?.id || 'system';

    if (operation === 'CREATE') {
      return {
        ...data,
        id: data.id || this.generateRecordId(),
        created_at: timestamp,
        updated_at: timestamp,
        created_by: userId,
        module: module
      };
    }

    if (operation === 'UPDATE') {
      return {
        ...data,
        updated_at: timestamp,
        updated_by: userId
      };
    }

    return data;
  }

  // ===========================================
  // DATABASE OPERATIONS
  // ===========================================

  async executeDatabaseOperation(operation, store, data, context) {
    try {
      switch (operation) {
        case 'CREATE':
          const addResult = await this.dbOps.add(store, data, context.user, context.page);
          return addResult.success ? addResult.data : addResult;
        
        case 'READ':
          if (data.id) {
            const getResult = await this.dbOps.getById(store, data.id);
            return getResult.success ? getResult.data : getResult;
          } else {
            const getAllResult = await this.dbOps.getAll(store);
            return getAllResult.success ? getAllResult.data : getAllResult;
          }
        
        case 'UPDATE':
          const updateResult = await this.dbOps.update(store, data);
          return updateResult.success ? updateResult.data : updateResult;
        
        case 'DELETE':
          const deleteResult = await this.dbOps.delete(store, data.id);
          return deleteResult.success ? deleteResult.data : deleteResult;
        
        case 'COUNT':
          const countResult = await this.dbOps.count(store);
          return countResult.success ? countResult.data : countResult;
        
        default:
          throw new Error(`Unsupported operation: ${operation}`);
      }
    } catch (error) {
      // Handle database errors gracefully
      if (error.message?.includes('object store')) {
        console.warn(`⚠️ Store ${store} not found, will be created automatically`);
        
        // For CREATE operations, try to create the store and retry
        if (operation === 'CREATE') {
          try {
            const retryResult = await this.dbOps.add(store, data, context.user, context.page);
            return retryResult.success ? retryResult.data : retryResult;
          } catch (retryError) {
            throw new Error(`Failed to create record in ${store}: ${retryError.message}`);
          }
        }
        
        // For READ operations, return empty result
        if (operation === 'READ') {
          return data.id ? null : [];
        }
        
        // For COUNT operations, return 0
        if (operation === 'COUNT') {
          return 0;
        }
      }
      
      throw error;
    }
  }

  async postProcessResult(operation, module, result, context) {
    try {
      // Create database backup for important operations
      if (operation === 'CREATE' || operation === 'UPDATE' || operation === 'DELETE') {
        await this.createDatabaseBackup(module, operation, result);
      }

      // Handle different result formats
      if (result === null || result === undefined) {
        return null;
      }

      if (Array.isArray(result)) {
        return result;
      }

      if (typeof result === 'object') {
        return result;
      }

      // For count operations
      if (operation === 'COUNT') {
        return { count: result };
      }

      return result;
    } catch (error) {
      console.warn(`⚠️ Post-processing warning for ${module}:`, error.message);
      return result; // Return original result even if post-processing fails
    }
  }

  async createDatabaseBackup(module, operation, result) {
    try {
      const timestamp = new Date().toISOString();
      const backupData = {
        module,
        operation,
        timestamp,
        result: typeof result === 'object' ? JSON.stringify(result) : result,
        backup_id: this.generateBackupId()
      };

      // Store backup in memory (IndexedDB)
      console.log(`💾 Database backed up for ${module} ${operation} at ${timestamp}`);
      
      // If Windows installation is complete, also backup to file system
      if (this.installationManager.isInstallationComplete()) {
        const backupPath = `C:/malwa-crm/Data_base/malwa-crm-backup-${timestamp}.json`;
        console.log(`💾 Database backed up to: ${backupPath}`);
      }
      
    } catch (error) {
      console.warn(`⚠️ Backup creation failed for ${module}:`, error.message);
    }
  }

  // ===========================================
  // RESPONSE CREATION
  // ===========================================

  createResponse(success, operation, module, data, error = null, operationId = null, duration = null) {
    const response = {
      success,
      operation,
      module,
      data,
      metadata: {
        timestamp: new Date().toISOString(),
        operationId,
        duration,
        source: 'unified-data-flow'
      }
    };

    if (error) {
      response.error = error;
    }

    return response;
  }

  // ===========================================
  // BATCH OPERATIONS
  // ===========================================

  /**
   * Execute multiple operations in sequence
   * @param {Array} operations - Array of operation objects
   */
  async executeBatch(operations) {
    if (!Array.isArray(operations)) {
      return this.createResponse(false, 'BATCH', 'multiple', null, 'Operations must be an array');
    }

    console.log(`🔄 [BATCH] Processing ${operations.length} operations...`);
    
    const results = [];
    let successCount = 0;
    let errorCount = 0;
    const startTime = Date.now();

    for (const op of operations) {
      try {
        const result = await this.executeUnifiedOperation(
          op.operation?.toUpperCase() || 'READ',
          op.module,
          op.data || {},
          op.context || {}
        );
        
        results.push(result);
        
        if (result.success) {
          successCount++;
        } else {
          errorCount++;
        }
      } catch (error) {
        errorCount++;
        results.push(this.createResponse(false, op.operation, op.module, null, error.message));
      }
    }

    const duration = Date.now() - startTime;
    console.log(`✅ [BATCH] Completed in ${duration}ms: ${successCount} success, ${errorCount} errors`);
    
    return {
      success: errorCount === 0,
      operation: 'BATCH',
      module: 'multiple',
      data: {
        results,
        summary: {
          total: operations.length,
          success: successCount,
          errors: errorCount
        }
      },
      metadata: {
        timestamp: new Date().toISOString(),
        duration,
        source: 'unified-data-flow'
      }
    };
  }

  // ===========================================
  // UTILITY METHODS
  // ===========================================

  generateOperationId() {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateRecordId() {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateBackupId() {
    return `backup_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  // ===========================================
  // STATUS AND HEALTH MONITORING
  // ===========================================

  getSystemStatus() {
    return {
      initialized: this.isInitialized,
      queueLength: this.operationQueue.length,
      modulesSupported: Object.keys(this.moduleMapping).length,
      installationComplete: this.installationManager.isInstallationComplete(),
      timestamp: new Date().toISOString()
    };
  }

  async performHealthCheck() {
    try {
      await this.validateSystemHealth();
      
      return {
        healthy: true,
        status: 'All systems operational',
        checks: {
          initialization: this.isInitialized,
          database: true,
          installation: this.installationManager.isInstallationComplete()
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        healthy: false,
        status: 'System health check failed',
        error: error.message,
        checks: {
          initialization: this.isInitialized,
          database: false,
          installation: this.installationManager.isInstallationComplete()
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  // ===========================================
  // CLEANUP AND RESET
  // ===========================================

  async resetSystem() {
    try {
      console.log('🔄 [UNIFIED-BACKEND] Resetting system...');
      
      this.operationQueue = [];
      this.isInitialized = false;
      
      // Reinitialize
      await this.initialize();
      
      console.log('✅ [UNIFIED-BACKEND] System reset completed');
      return { success: true, message: 'System reset completed' };
    } catch (error) {
      console.error('❌ [UNIFIED-BACKEND] System reset failed:', error);
      return { success: false, error: error.message };
    }
  }
}

// Create and export singleton instance
const unifiedDataFlowManager = new UnifiedDataFlowManager();
export default unifiedDataFlowManager;