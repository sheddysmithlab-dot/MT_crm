/**
 * Path Configuration for Malwa CRM
 * Provides proper data paths for both Electron and web environments
 */
import pathConfig from './pathConfig.js';

class PathManager {
  constructor() {
    this.isElectron = typeof window !== 'undefined' && window.electron;
    this.customDataPath = null;
    this.databasePath = null;
    this.initialized = false;
    
    this.init();
  }

  async init() {
    try {
      // Load paths from configuration
      const basePath = await pathConfig.getBasePath();
      
      if (this.isElectron) {
        // Get paths from Electron main process
        const electronDataPath = await window.electron.getCustomDataPath();
        const electronDbPath = await window.electron.getDatabasePath();
        
        // Use Electron paths if available, otherwise use config
        this.customDataPath = electronDataPath || basePath.replace('/Data_base', '');
        this.databasePath = electronDbPath || basePath;
        
        // Ensure database directory exists
        await window.electron.ensureDirectory(this.databasePath);
        
        console.log('📁 Electron paths configured:');
        console.log('  • Custom Data Path:', this.customDataPath);
        console.log('  • Database Path:', this.databasePath);
      } else {
        // Use configuration-based paths for web
        this.customDataPath = basePath.replace('/Data_base', '');
        this.databasePath = basePath;
        console.log('🌐 Web environment detected, using config paths');
        console.log('  • Database Path:', this.databasePath);
      }
    } catch (error) {
      console.warn('⚠️ Failed to initialize paths, using fallbacks:', error);
      // Fallback paths
      this.customDataPath = 'C:/malwa-crm';
      this.databasePath = 'C:/malwa-crm/Data_base';
    }
    
    this.initialized = true;
  }

  // Get main data directory
  getDataPath() {
    return this.customDataPath;
  }

  // Get database directory
  getDatabasePath() {
    return this.databasePath;
  }

  // Get user-specific workspace path
  getUserWorkspacePath(userId) {
    return `${this.databasePath}/Users/${userId}`;
  }

  // Get page-specific data path
  getPageDataPath(pageName, userId = null) {
    if (userId) {
      return `${this.getUserWorkspacePath(userId)}/${pageName}`;
    }
    return `${this.databasePath}/${pageName}`;
  }

  // Get module-specific file path
  getModuleFilePath(moduleName, fileName) {
    return `${this.databasePath}/${moduleName}/${fileName}`;
  }

  // Get backup directory path
  getBackupPath() {
    return `${this.customDataPath}/Backups`;
  }

  // Get exports directory path
  getExportsPath() {
    return `${this.customDataPath}/Exports`;
  }

  // Get logs directory path
  getLogsPath() {
    return `${this.customDataPath}/Logs`;
  }

  // Get Google Drive sync directory path
  getGoogleDriveSyncPath() {
    return `${this.customDataPath}/GoogleDrive_Sync`;
  }

  // Ensure directory exists (Electron only)
  async ensureDirectory(dirPath) {
    if (this.isElectron) {
      try {
        const result = await window.electron.ensureDirectory(dirPath);
        if (result.success) {
          console.log('📁 Directory ensured:', dirPath);
          return true;
        } else {
          console.error('❌ Failed to ensure directory:', result.error);
          return false;
        }
      } catch (error) {
        console.error('❌ Error ensuring directory:', error);
        return false;
      }
    } else {
      console.warn('⚠️ Directory creation not available in web environment');
      return false;
    }
  }

  // Create all required directories
  async initializeDirectoryStructure() {
    if (!this.isElectron) {
      console.warn('⚠️ Directory initialization only available in Electron');
      return false;
    }

    const requiredDirs = [
      this.customDataPath,
      this.databasePath,
      `${this.databasePath}/Users`,
      `${this.databasePath}/Customers`,
      `${this.databasePath}/Jobs`,
      `${this.databasePath}/Inventory`,
      `${this.databasePath}/Labour`,
      `${this.databasePath}/Vendors`,
      `${this.databasePath}/Suppliers`,
      `${this.databasePath}/Accounts`,
      `${this.databasePath}/Summary`,
      `${this.databasePath}/Settings`,
      this.getBackupPath(),
      this.getExportsPath(),
      this.getLogsPath(),
      this.getGoogleDriveSyncPath()
    ];

    let successCount = 0;
    for (const dir of requiredDirs) {
      if (await this.ensureDirectory(dir)) {
        successCount++;
      }
    }

    console.log(`📁 Directory initialization: ${successCount}/${requiredDirs.length} directories created/verified`);
    return successCount === requiredDirs.length;
  }

  // Wait for initialization to complete
  async waitForInitialization() {
    if (this.initialized) return;
    
    return new Promise((resolve) => {
      const checkInit = () => {
        if (this.initialized) {
          resolve();
        } else {
          setTimeout(checkInit, 100);
        }
      };
      checkInit();
    });
  }

  // Get all paths for debugging
  getAllPaths() {
    return {
      isElectron: this.isElectron,
      customDataPath: this.customDataPath,
      databasePath: this.databasePath,
      backupPath: this.getBackupPath(),
      exportsPath: this.getExportsPath(),
      logsPath: this.getLogsPath(),
      googleDriveSyncPath: this.getGoogleDriveSyncPath(),
      initialized: this.initialized
    };
  }
}

// Create singleton instance
const pathManager = new PathManager();

export { pathManager as default, PathManager };