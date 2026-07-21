/**
 * Enhanced Database Operations with Unified Backend Pattern
 * Memory-focused operations without problematic file system dependencies
 * 
 * Eliminates: backupToFileSystem errors, DOMTokenList errors, sync errors
 * Provides: Clean CRUD operations, validation, structured responses
 */

import { dbOperations } from '@/lib/db.js';
import windowsInstallationManager from './windowsInstallationManager.js';

class EnhancedDbOperations {
  constructor() {
    this.originalOps = dbOperations;
    this.installationManager = windowsInstallationManager;
    this.isInitialized = false;
    this.operationCount = 0;
    this.initializeOperations();
  }

  async initializeOperations() {
    try {
      console.log('🔄 [ENHANCED-DB] Initializing enhanced database operations...');
      
      // Ensure Windows installation is ready
      await this.installationManager.ensureInstallationComplete();
      
      this.isInitialized = true;
      console.log('✅ [ENHANCED-DB] Enhanced database operations initialized');
    } catch (error) {
      console.error('❌ [ENHANCED-DB] Initialization failed:', error);
      this.isInitialized = false;
    }
  }

  // ===========================================
  // UNIFIED CRUD OPERATIONS
  // ===========================================

  /**
   * Enhanced Add Operation
   * @param {string} store - Store name
   * @param {object} data - Data to add
   * @param {object} user - User context (optional)
   * @param {string} page - Page context (optional)
   */
  async add(store, data, user = null, page = null) {
    return await this.executeEnhancedOperation('ADD', store, data, { user, page });
  }

  /**
   * Enhanced Get All Operation
   * @param {string} store - Store name
   */
  async getAll(store) {
    return await this.executeEnhancedOperation('GET_ALL', store, {});
  }

  /**
   * Enhanced Update Operation
   * @param {string} store - Store name
   * @param {object} data - Data to update (must include id)
   */
  async update(store, data) {
    return await this.executeEnhancedOperation('UPDATE', store, data);
  }

  /**
   * Enhanced Delete Operation
   * @param {string} store - Store name
   * @param {string} id - Record ID to delete
   */
  async delete(store, id) {
    return await this.executeEnhancedOperation('DELETE', store, { id });
  }

  /**
   * Enhanced Get By ID Operation
   * @param {string} store - Store name
   * @param {string} id - Record ID
   */
  async getById(store, id) {
    return await this.executeEnhancedOperation('GET_BY_ID', store, { id });
  }

  /**
   * Enhanced Count Operation
   * @param {string} store - Store name
   */
  async count(store) {
    return await this.executeEnhancedOperation('COUNT', store, {});
  }

  // ===========================================
  // CORE ENHANCED OPERATION EXECUTOR
  // ===========================================

  async executeEnhancedOperation(operation, store, data, context = {}) {
    const operationId = ++this.operationCount;
    const startTime = Date.now();

    try {
      console.log(`🔄 [ENHANCED-DB-${operation}] Store: ${store} - Op: ${operationId}`);

      // Input validation
      const validationResult = this.validateInput(operation, store, data);
      if (!validationResult.success) {
        return this.createEnhancedResponse(false, operation, store, null, validationResult.error);
      }

      // Enhance data with metadata
      const enhancedData = this.enhanceDataWithMetadata(operation, data, context);

      // Execute database operation
      const dbResult = await this.executeDatabaseCall(operation, store, enhancedData);

      // Post-process result
      const finalResult = this.processResult(operation, dbResult);

      const duration = Date.now() - startTime;
      console.log(`✅ [ENHANCED-DB-${operation}] Store: ${store} completed in ${duration}ms`);

      return this.createEnhancedResponse(true, operation, store, finalResult, null, duration);

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ [ENHANCED-DB-${operation}] Store: ${store} failed after ${duration}ms:`, error.message);
      return this.createEnhancedResponse(false, operation, store, null, error.message, duration);
    }
  }

  // ===========================================
  // INPUT VALIDATION
  // ===========================================

  validateInput(operation, store, data) {
    try {
      // Store validation
      if (!store || typeof store !== 'string') {
        return { success: false, error: 'Invalid store name' };
      }

      // Data validation for operations that require data
      if (['ADD', 'UPDATE'].includes(operation)) {
        if (!data || typeof data !== 'object') {
          return { success: false, error: 'Invalid data object' };
        }
      }

      // ID validation for operations that require ID
      if (['UPDATE', 'DELETE', 'GET_BY_ID'].includes(operation)) {
        const id = operation === 'UPDATE' ? data.id : data.id;
        if (!id) {
          return { success: false, error: 'ID is required for this operation' };
        }
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ===========================================
  // DATA ENHANCEMENT
  // ===========================================

  enhanceDataWithMetadata(operation, data, context) {
    const timestamp = new Date().toISOString();

    if (operation === 'ADD') {
      return {
        ...data,
        id: data.id || this.generateId(),
        created_at: timestamp,
        updated_at: timestamp,
        created_by: context.user?.id || 'system',
        version: 1,
        _metadata: {
          operation: 'CREATE',
          timestamp,
          source: 'enhanced-db'
        }
      };
    }

    if (operation === 'UPDATE') {
      return {
        ...data,
        updated_at: timestamp,
        updated_by: context.user?.id || 'system',
        version: (data.version || 0) + 1,
        _metadata: {
          operation: 'UPDATE',
          timestamp,
          source: 'enhanced-db'
        }
      };
    }

    return data;
  }

  // ===========================================
  // DATABASE CALLS
  // ===========================================

  async executeDatabaseCall(operation, store, data) {
    try {
      switch (operation) {
        case 'ADD':
          return await this.originalOps.insert(store, data);

        case 'GET_ALL':
          return await this.originalOps.getAll(store);

        case 'UPDATE':
          // Use original operations for update
          const existingRecord = await this.originalOps.getById(store, data.id);
          if (!existingRecord) {
            throw new Error(`Record with ID ${data.id} not found`);
          }
          return await this.originalOps.update(store, data.id, data);

        case 'DELETE':
          return await this.originalOps.delete(store, data.id);

        case 'GET_BY_ID':
          return await this.originalOps.getById(store, data.id);

        case 'COUNT':
          return await this.originalOps.count(store);

        default:
          throw new Error(`Unsupported operation: ${operation}`);
      }
    } catch (error) {
      // Handle common database errors gracefully
      if (this.isDatabaseStoreError(error)) {
        return await this.handleStoreNotFoundError(operation, store, data);
      }
      throw error;
    }
  }

  isDatabaseStoreError(error) {
    const errorMessage = error.message?.toLowerCase() || '';
    return errorMessage.includes('object store') || 
           errorMessage.includes('not found') || 
           errorMessage.includes('transaction');
  }

  async handleStoreNotFoundError(operation, store, data) {
    console.warn(`⚠️ [ENHANCED-DB] Store ${store} not found, attempting graceful handling...`);

    switch (operation) {
      case 'ADD':
        // Try to create the record anyway - the database layer will create the store
        try {
          return await this.originalOps.add(store, data);
        } catch (retryError) {
          throw new Error(`Failed to create record in ${store}: ${retryError.message}`);
        }

      case 'GET_ALL':
        return []; // Return empty array for non-existent store

      case 'GET_BY_ID':
        return null; // Return null for non-existent record

      case 'COUNT':
        return 0; // Return 0 for non-existent store

      case 'UPDATE':
      case 'DELETE':
        throw new Error(`Cannot ${operation.toLowerCase()} in non-existent store: ${store}`);

      default:
        throw new Error(`Store ${store} not found`);
    }
  }

  // ===========================================
  // RESULT PROCESSING
  // ===========================================

  processResult(operation, result) {
    // Clean up any problematic data that might cause DOMTokenList errors
    if (result && typeof result === 'object') {
      return this.sanitizeResult(result);
    }

    return result;
  }

  sanitizeResult(data) {
    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeResultItem(item));
    }

    return this.sanitizeResultItem(data);
  }

  sanitizeResultItem(item) {
    if (!item || typeof item !== 'object') {
      return item;
    }

    const sanitized = { ...item };

    // Remove or fix problematic properties that might cause DOMTokenList errors
    Object.keys(sanitized).forEach(key => {
      const value = sanitized[key];
      
      // Convert objects to strings if they might be used as CSS classes
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // Only convert if this looks like it might be used as a className
        if (key.includes('class') || key.includes('style') || key.includes('css')) {
          sanitized[key] = JSON.stringify(value);
        }
      }
      
      // Ensure string values don't contain problematic characters for CSS classes
      if (typeof value === 'string' && (key.includes('class') || key.includes('css'))) {
        sanitized[key] = value.replace(/[{}[\]]/g, '').trim();
      }
    });

    return sanitized;
  }

  // ===========================================
  // RESPONSE CREATION
  // ===========================================

  createEnhancedResponse(success, operation, store, data, error = null, duration = null) {
    const response = {
      success,
      operation,
      store,
      data,
      metadata: {
        timestamp: new Date().toISOString(),
        duration,
        source: 'enhanced-db-operations'
      }
    };

    if (error) {
      response.error = error;
    }

    return response;
  }

  // ===========================================
  // UTILITY METHODS
  // ===========================================

  generateId() {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // ===========================================
  // HEALTH AND STATUS
  // ===========================================

  getOperationStats() {
    return {
      initialized: this.isInitialized,
      totalOperations: this.operationCount,
      installationReady: this.installationManager.isInstallationComplete(),
      timestamp: new Date().toISOString()
    };
  }

  async validateStoreHealth(store) {
    try {
      await this.originalOps.count(store);
      return { healthy: true, store };
    } catch (error) {
      return { 
        healthy: false, 
        store, 
        error: error.message,
        canRecover: this.isDatabaseStoreError(error)
      };
    }
  }

  // ===========================================
  // STORE VALIDATION METHODS (No File System Backup)
  // ===========================================

  /**
   * Validate store without problematic file system operations
   * This replaces the problematic backupToFileSystem method
   */
  async validateStore(store) {
    try {
      console.log(`🔍 [ENHANCED-DB] Validating store: ${store}`);
      
      // Simple validation - just check if we can access the store
      const count = await this.originalOps.count(store);
      
      console.log(`✅ [ENHANCED-DB] Store ${store} validated: ${count} records`);
      return {
        valid: true,
        store,
        recordCount: count,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.warn(`⚠️ [ENHANCED-DB] Store ${store} validation warning:`, error.message);
      return {
        valid: false,
        store,
        error: error.message,
        canRecover: this.isDatabaseStoreError(error),
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Memory-based sync operations without file system dependencies
   */
  async fullSync(store) {
    try {
      console.log(`🔄 [ENHANCED-DB] Starting memory sync for: ${store}`);
      
      // Get all data from store
      const allData = await this.getAll(store);
      
      if (allData.success && Array.isArray(allData.data)) {
        console.log(`✅ [ENHANCED-DB] Memory sync completed for ${store}: ${allData.data.length} records`);
        return {
          success: true,
          store,
          recordCount: allData.data.length,
          operation: 'memory-sync'
        };
      } else {
        console.warn(`⚠️ [ENHANCED-DB] Memory sync warning for ${store}: no data or error`);
        return {
          success: false,
          store,
          error: 'No data available or store error',
          operation: 'memory-sync'
        };
      }
    } catch (error) {
      console.error(`❌ [ENHANCED-DB] Memory sync failed for ${store}:`, error.message);
      return {
        success: false,
        store,
        error: error.message,
        operation: 'memory-sync'
      };
    }
  }

  // ===========================================
  // ADDITIONAL OPERATIONS FOR COMPATIBILITY
  // ===========================================

  async search(store, searchTerm, field) {
    try {
      const result = await this.originalOps.search(store, searchTerm, field);
      return this.sanitizeResult(result);
    } catch (error) {
      console.error(`❌ [ENHANCED-DB] Search failed for ${store}:`, error.message);
      return [];
    }
  }

  async clear(store) {
    try {
      const result = await this.originalOps.clear(store);
      console.log(`✅ [ENHANCED-DB] Store ${store} cleared`);
      return result;
    } catch (error) {
      console.error(`❌ [ENHANCED-DB] Clear failed for ${store}:`, error.message);
      throw error;
    }
  }
}

// Create and export singleton instance
const enhancedDbOperations = new EnhancedDbOperations();
export default enhancedDbOperations;