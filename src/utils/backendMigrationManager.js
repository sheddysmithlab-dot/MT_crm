/**
 * Backend Migration Utility for Malwa CRM
 * Ensures all components use the upgraded C:/malwa-crm/Data_base structure
 */

import { desktopSyncHandler } from './desktopSyncHandler.js';
import pathConfig from './pathConfig.js';

class BackendMigrationManager {
  constructor() {
    this.isInitialized = false;
    this.migrationStatus = {
      pathConfig: false,
      electronIPC: false,
      database: false,
      fileStructure: false,
      syncHandlers: false
    };
  }

  /**
   * Initialize complete backend migration
   */
  async initialize() {
    // Web / browser: skip legacy C:/malwa-crm file migration entirely
    const isElectron = typeof window !== 'undefined' && !!window.electron?.isElectron;
    if (!isElectron) {
      this.isInitialized = true;
      return { success: true, message: 'Skipped — web API mode (no C:/malwa-crm)' };
    }

    if (this.isInitialized) {
      console.log('📦 Backend migration already initialized');
      return { success: true, message: 'Already initialized' };
    }

    try {
      console.log('🚀 Starting desktop file migration (Electron only)...');

      // Step 1: Initialize path configuration
      await this.initializePathConfig();

      // Step 2: Verify Electron environment
      await this.verifyElectronEnvironment();

      // Step 3: Initialize database structure
      await this.initializeDatabaseStructure();

      // Step 4: Initialize file structure
      await this.initializeFileStructure();

      // Step 5: Initialize sync handlers
      await this.initializeSyncHandlers();

      this.isInitialized = true;
      console.log('✅ Backend migration completed successfully');

      return {
        success: true,
        message: 'Backend migration completed',
        status: this.migrationStatus
      };

    } catch (error) {
      console.error('❌ Backend migration failed:', error);
      return {
        success: false,
        error: error.message,
        status: this.migrationStatus
      };
    }
  }

  /**
   * Initialize path configuration
   */
  async initializePathConfig() {
    try {
      console.log('📁 Initializing path configuration...');
      await pathConfig.initPathConfig();
      
      const basePath = await pathConfig.getBasePath();
      if (basePath === 'C:/malwa-crm/Data_base') {
        this.migrationStatus.pathConfig = true;
        console.log('✅ Path configuration initialized');
      } else {
        throw new Error(`Invalid base path: ${basePath}`);
      }
    } catch (error) {
      console.error('❌ Path configuration failed:', error);
      throw error;
    }
  }

  /**
   * Verify Electron environment and IPC methods
   */
  async verifyElectronEnvironment() {
    try {
      console.log('🔌 Verifying Electron environment...');
      
      if (!window.electron) {
        console.log('🌐 Running in browser mode - Electron features disabled');
        this.migrationStatus.electronIPC = true; // Consider browser mode as success
        return;
      }

      // Verify required IPC methods
      const requiredMethods = [
        'getDbConfig',
        'initDbStructure',
        'fileExists',
        'writeFile',
        'readFile',
        'ensureDirectory'
      ];

      for (const method of requiredMethods) {
        if (typeof window.electron[method] !== 'function') {
          throw new Error(`Missing Electron IPC method: ${method}`);
        }
      }

      this.migrationStatus.electronIPC = true;
      console.log('✅ Electron environment verified');
    } catch (error) {
      console.error('❌ Electron verification failed:', error);
      throw error;
    }
  }

  /**
   * Initialize database structure using Electron
   */
  async initializeDatabaseStructure() {
    try {
      console.log('🗄️ Initializing database structure...');

      if (window.electron?.initDbStructure) {
        const result = await window.electron.initDbStructure();
        if (result.success) {
          this.migrationStatus.database = true;
          console.log('✅ Database structure initialized');
        } else {
          throw new Error(`Database initialization failed: ${result.error}`);
        }
      } else {
        console.log('🌐 Browser mode - skipping database structure initialization');
        this.migrationStatus.database = true;
      }
    } catch (error) {
      console.error('❌ Database structure initialization failed:', error);
      throw error;
    }
  }

  /**
   * Initialize file structure validation
   */
  async initializeFileStructure() {
    try {
      console.log('📂 Validating file structure...');

      // Get all module paths from config
      const modulePaths = await pathConfig.getAllModulePaths();
      const modules = Object.keys(modulePaths);

      console.log(`📋 Validating ${modules.length} module directories:`, modules);

      // In Electron, ensure all directories exist
      if (window.electron?.ensureDirectory) {
        for (const [module, path] of Object.entries(modulePaths)) {
          const result = await window.electron.ensureDirectory(path);
          if (!result.success) {
            throw new Error(`Failed to create directory for ${module}: ${result.error}`);
          }
        }
      }

      this.migrationStatus.fileStructure = true;
      console.log('✅ File structure validated');
    } catch (error) {
      console.error('❌ File structure validation failed:', error);
      throw error;
    }
  }

  /**
   * Initialize sync handlers
   */
  async initializeSyncHandlers() {
    try {
      console.log('🔄 Initializing sync handlers...');

      // Initialize desktop sync handler if in Electron environment
      if (window.electron && desktopSyncHandler) {
        desktopSyncHandler.init();
      }

      this.migrationStatus.syncHandlers = true;
      console.log('✅ Sync handlers initialized');
    } catch (error) {
      console.error('❌ Sync handler initialization failed:', error);
      throw error;
    }
  }

  /**
   * Get migration status
   */
  getMigrationStatus() {
    return {
      isInitialized: this.isInitialized,
      status: this.migrationStatus,
      summary: {
        total: Object.keys(this.migrationStatus).length,
        completed: Object.values(this.migrationStatus).filter(Boolean).length,
        percentage: Math.round((Object.values(this.migrationStatus).filter(Boolean).length / Object.keys(this.migrationStatus).length) * 100)
      }
    };
  }

  /**
   * Test backend functionality
   */
  async testBackend() {
    try {
      console.log('🧪 Testing backend functionality...');
      
      const tests = {
        pathConfig: false,
        electronAPI: false,
        fileOperations: false,
        databaseConfig: false
      };

      // Test path configuration
      try {
        const basePath = await pathConfig.getBasePath();
        const customerPath = await pathConfig.getModulePath('customer');
        tests.pathConfig = basePath && customerPath;
      } catch (error) {
        console.warn('Path config test failed:', error.message);
      }

      // Test Electron API
      if (window.electron) {
        try {
          const dbConfig = await window.electron.getDbConfig();
          tests.electronAPI = !!dbConfig.path;
          tests.databaseConfig = dbConfig.path === 'C:/malwa-crm/Data_base';
        } catch (error) {
          console.warn('Electron API test failed:', error.message);
        }

        // Test file operations
        try {
          const testPath = 'C:/malwa-crm/test-backend-functionality.json';
          const writeResult = await window.electron.writeFile(testPath, '{"test": true}');
          const fileExists = await window.electron.fileExists(testPath);
          tests.fileOperations = writeResult.success && fileExists;
        } catch (error) {
          console.warn('File operations test failed:', error.message);
        }
      }

      console.log('🧪 Backend test results:', tests);
      return tests;
    } catch (error) {
      console.error('❌ Backend test failed:', error);
      return null;
    }
  }

  /**
   * Get backend configuration summary
   */
  async getConfigSummary() {
    const summary = {
      environment: window.electron ? 'Electron Desktop' : 'Browser',
      pathConfig: await pathConfig.getFullConfig(),
      basePath: await pathConfig.getBasePath(),
      modules: await pathConfig.getAllModulePaths(),
      migrationStatus: this.getMigrationStatus()
    };

    if (window.electron) {
      try {
        summary.electronConfig = await window.electron.getDbConfig();
      } catch (error) {
        summary.electronError = error.message;
      }
    }

    return summary;
  }
}

// Create singleton instance
export const backendMigrationManager = new BackendMigrationManager();

// Electron desktop only — web never auto-runs C:/malwa-crm migration
if (typeof window !== 'undefined' && window.electron?.isElectron) {
  const boot = async () => {
    try {
      await backendMigrationManager.initialize();
    } catch (error) {
      console.error('Desktop migration failed:', error);
    }
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    setTimeout(boot, 100);
  }
}

export default backendMigrationManager;