/**
 * Windows Installation Manager for Malwa CRM
 * Handles automatic database setup during Windows installation
 * Location: C:/malwa-crm/Data_base
 */

import pathConfig from './pathConfig.js';

class WindowsInstallationManager {
  constructor() {
    this.baseInstallPath = 'C:/malwa-crm/Data_base';
    this.isFirstRun = false;
    this.installedStructure = null;
    this.requiredFolders = [
      'accounts',
      'customer',
      'inventory',
      'jobs',
      'labour',
      'settings',
      'summary',
      'supplier',
      'vendors'
    ];
    
    // Base folder files (main Data_base folder)
    this.baseFiles = [
      { file: 'meta.json', data: { created: new Date().toISOString(), version: '4.0.0' } },
      { file: 'Accounts.json', data: [] },
      { file: 'CashReceipt.json', data: [] },
      { file: 'Customer.json', data: [] },
      { file: 'DailyTasks.json', data: [] },
      { file: 'Dashboard.json', data: [] },
      { file: 'Inventory.json', data: [] },
      { file: 'Jobs.json', data: [] },
      { file: 'Labour.json', data: [] },
      { file: 'Login.json', data: [] },
      { file: 'Settings.json', data: this.getDefaultSettings() },
      { file: 'Summary.json', data: [] },
      { file: 'Supplier.json', data: [] },
      { file: 'Vendors.json', data: [] },
      { file: 'SyncQueue.json', data: [] },
      { file: 'JobOperationsQueue.json', data: [] },
      { file: 'UserPageVisibility.json', data: {} }
    ];
    
    this.moduleFiles = {
      'accounts': [
        { file: 'accounts.json', data: [] },
        { file: 'meta.json', data: { module: 'accounts', created: new Date().toISOString() } },
        { file: 'CashReceipt.json', data: [] },
        { file: 'Challan.json', data: [] },
        { file: 'Gstledger.json', data: [] },
        { file: 'Invoice.json', data: [] },
        { file: 'OtherExpenses.json', data: [] },
        { file: 'Purchase.json', data: [] },
        { file: 'Sellchallan.json', data: [] },
        { file: 'Voucher.json', data: [] }
      ],
      'customer': [
        { file: 'customer.json', data: [] },
        { file: 'meta.json', data: { module: 'customer', created: new Date().toISOString() } },
        { file: 'CustomerDetailsTab.json', data: [] },
        { file: 'CustomerLedgerTab.json', data: [] },
        { file: 'LeadsTab.json', data: [] }
      ],
      'inventory': [
        { file: 'inventory.json', data: [] },
        { file: 'meta.json', data: { module: 'inventory', created: new Date().toISOString() } },
        { file: 'CategoryManager.json', data: [] },
        { file: 'StockMovements.json', data: [] },
        { file: 'StockTab.json', data: [] }
      ],
      'jobs': [
        { file: 'jobs.json', data: [] },
        { file: 'meta.json', data: { module: 'jobs', created: new Date().toISOString() } },
        { file: 'ChalanStep.json', data: [] },
        { file: 'EstimateStep.json', data: [] },
        { file: 'InspectionStep.json', data: [] },
        { file: 'InvoiceStep.json', data: [] },
        { file: 'JobSheetStep.json', data: [] }
      ],
      'labour': [
        { file: 'labour.json', data: [] },
        { file: 'meta.json', data: { module: 'labour', created: new Date().toISOString() } },
        { file: 'LabourDetailsTab.json', data: [] },
        { file: 'LabourLedgerTab.json', data: [] },
        { file: 'LabourLedgerView.json', data: [] }
      ],
      'settings': [
        { file: 'settings.json', data: [] },
        { file: 'meta.json', data: { module: 'settings', created: new Date().toISOString() } },
        { file: 'AboutTab.json', data: {} },
        { file: 'AuditLogsTab.json', data: [] },
        { file: 'BackupSettingsTab.json', data: {} },
        { file: 'CompanyMasterTab.json', data: {} },
        { file: 'GeneralSettingsTab.json', data: {} },
        { file: 'InventorySettingsTab.json', data: {} },
        { file: 'InvoiceSettingsTab.json', data: {} },
        { file: 'LedgerSettingsTab.json', data: {} },
        { file: 'MultiplierSettingsTab.json', data: {} },
        { file: 'MyProfileTab.json', data: {} },
        { file: 'RateListMemoryTab.json', data: [] },
        { file: 'SecuritySettingsTab.json', data: {} },
        { file: 'UserManagementTab.json', data: [] },
        { file: 'RateHistory.json', data: [] },
        { file: 'Templates.json', data: [] },
        { file: 'Roles.json', data: [] },
        { file: 'Permissions.json', data: [] },
        { file: 'Taxes.json', data: [] },
        { file: 'HsnCodes.json', data: [] },
        { file: 'AuditLogs.json', data: [] },
        { file: 'Sequences.json', data: [] }
      ],
      'summary': [
        { file: 'summary.json', data: [] },
        { file: 'meta.json', data: { module: 'summary', created: new Date().toISOString() } },
        { file: 'IncentiveSummary.json', data: [] },
        { file: 'PenaltyCard.json', data: [] },
        { file: 'SummaryDashboard.json', data: [] }
      ],
      'supplier': [
        { file: 'supplier.json', data: [] },
        { file: 'meta.json', data: { module: 'supplier', created: new Date().toISOString() } },
        { file: 'SupplierDetailsTab.json', data: [] },
        { file: 'SupplierLedgerTab.json', data: [] }
      ],
      'vendors': [
        { file: 'vendors.json', data: [] },
        { file: 'meta.json', data: { module: 'vendors', created: new Date().toISOString() } },
        { file: 'VendorDetailsTab.json', data: [] },
        { file: 'VendorLedgerTab.json', data: [] }
      ]
    };
  }

  /**
   * Main installation check and setup method
   * Runs during app startup to ensure proper installation
   */
  async checkAndSetupInstallation() {
    try {
      console.log('🔍 Checking Windows installation status...');
      
      // Check if running on Windows
      if (!this.isWindows()) {
        console.log('📱 Non-Windows environment detected - skipping Windows-specific setup');
        return { success: true, message: 'Non-Windows environment', mode: 'browser' };
      }

      // Check if Electron APIs are available
      if (!window.electron || !window.electron.fs) {
        console.log('🌐 Browser mode detected - skipping file system setup');
        // Mark as complete for browser mode
        this.installedStructure = {
          status: 'complete',
          mode: 'browser',
          completedAt: new Date().toISOString()
        };
        return { success: true, message: 'Browser mode - no file system needed', mode: 'browser' };
      }

      // Electron environment - proceed with file system setup
      // Check if base installation directory exists
      const installationExists = await this.checkInstallationExists();
      
      if (installationExists) {
        console.log('✅ Existing installation detected - skipping file creation');
        await this.validateExistingInstallation();
        return { success: true, message: 'Existing installation validated', skipCreation: true };
      } else {
        console.log('🆕 Fresh installation detected - creating database structure');
        const setupResult = await this.performFreshInstallation();
        return setupResult;
      }

    } catch (error) {
      console.error('❌ Installation check failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if current OS is Windows
   */
  isWindows() {
    return navigator.platform.toLowerCase().includes('win') || 
           navigator.userAgent.toLowerCase().includes('windows');
  }

  /**
   * Check if installation directory already exists
   */
  async checkInstallationExists() {
    try {
      const pathExists = await window.electron.fileExists(this.baseInstallPath);
      console.log(`📁 Installation path check: ${this.baseInstallPath} - ${pathExists ? 'EXISTS' : 'NOT FOUND'}`);
      return pathExists;
    } catch (error) {
      console.warn('⚠️ Path existence check failed:', error);
      return false;
    }
  }

  /**
   * Validate existing installation structure
   */
  async validateExistingInstallation() {
    try {
      if (!window.electron?.fs?.pathExists || !window.electron?.fileExists) {
        console.warn('⚠️ Cannot validate installation - Electron FS API not available');
        return;
      }

      console.log('🔍 Validating existing installation...');
      
      const missingFolders = [];
      const missingFiles = [];

      // Check required folders
      for (const folder of this.requiredFolders) {
        const folderPath = `${this.baseInstallPath}/${folder}`;
        const exists = await window.electron.fileExists(folderPath);
        if (!exists) {
          missingFolders.push(folder);
        }
      }

      // Create missing folders only
      if (missingFolders.length > 0) {
        console.log(`📁 Creating ${missingFolders.length} missing folders...`);
        for (const folder of missingFolders) {
          await this.createFolder(folder);
        }
      }

      // Check base files (only if Electron API is available)
      if (window.electron && window.electron.fs && window.electron.fs.pathExists) {
        for (const fileConfig of this.baseFiles) {
          const filePath = `${this.baseInstallPath}/${fileConfig.file}`;
          try {
            const exists = await window.electron.fs.pathExists(filePath);
            if (!exists) {
              missingFiles.push({ type: 'base', config: fileConfig });
            }
          } catch (error) {
            console.warn(`⚠️ Could not check file existence: ${filePath}`);
            missingFiles.push({ type: 'base', config: fileConfig });
          }
        }
        
        // Check module files
        for (const [moduleName, moduleFiles] of Object.entries(this.moduleFiles)) {
          for (const fileConfig of moduleFiles) {
            const filePath = `${this.baseInstallPath}/${moduleName}/${fileConfig.file}`;
            try {
              const exists = await window.electron.fs.pathExists(filePath);
              if (!exists) {
                missingFiles.push({ type: 'module', module: moduleName, config: fileConfig });
              }
            } catch (error) {
              console.warn(`⚠️ Could not check file existence: ${filePath}`);
              missingFiles.push({ type: 'module', module: moduleName, config: fileConfig });
            }
          }
        }
      } else {
        console.warn('⚠️ Electron filesystem API not available, skipping file validation');
        // In browser mode, assume files need to be created
        this.baseFiles.forEach(fileConfig => {
          missingFiles.push({ type: 'base', config: fileConfig });
        });
        Object.entries(this.moduleFiles).forEach(([moduleName, moduleFiles]) => {
          moduleFiles.forEach(fileConfig => {
            missingFiles.push({ type: 'module', module: moduleName, config: fileConfig });
          });
        });
      }

      // Create missing files only
      if (missingFiles.length > 0) {
        console.log(`📄 Creating ${missingFiles.length} missing files...`);
        for (const fileInfo of missingFiles) {
          if (fileInfo.type === 'base') {
            await this.createBaseFile(fileInfo.config);
          } else {
            await this.createModuleFile(fileInfo.module, fileInfo.config);
          }
        }
      }

      console.log(`✅ Installation validation complete - ${missingFolders.length} folders and ${missingFiles.length} files restored`);
      
    } catch (error) {
      console.error('❌ Installation validation failed:', error);
    }
  }

  /**
   * Perform fresh installation setup
   */
  async performFreshInstallation() {
    try {
      console.log('🚀 Starting fresh installation setup...');
      
      // Create base installation directory
      await window.electron.ensureDirectory(this.baseInstallPath);
      console.log(`📁 Created base directory: ${this.baseInstallPath}`);

      // Create all required folders
      console.log('📁 Creating folder structure...');
      const folderResults = [];
      for (const folder of this.requiredFolders) {
        try {
          await this.createFolder(folder);
          folderResults.push({ folder, success: true });
        } catch (error) {
          console.error(`❌ Failed to create folder ${folder}:`, error);
          folderResults.push({ folder, success: false, error: error.message });
        }
      }

      // Create base folder files
      console.log('📄 Creating base folder files...');
      const fileResults = [];
      for (const fileConfig of this.baseFiles) {
        try {
          await this.createBaseFile(fileConfig);
          fileResults.push({ file: fileConfig.file, success: true });
        } catch (error) {
          console.error(`❌ Failed to create base file ${fileConfig.file}:`, error);
          fileResults.push({ file: fileConfig.file, success: false, error: error.message });
        }
      }
      
      // Create module-specific files
      console.log('📄 Creating module files...');
      for (const [moduleName, moduleFiles] of Object.entries(this.moduleFiles)) {
        for (const fileConfig of moduleFiles) {
          try {
            await this.createModuleFile(moduleName, fileConfig);
            fileResults.push({ file: `${moduleName}/${fileConfig.file}`, success: true });
          } catch (error) {
            console.error(`❌ Failed to create module file ${moduleName}/${fileConfig.file}:`, error);
            fileResults.push({ file: `${moduleName}/${fileConfig.file}`, success: false, error: error.message });
          }
        }
      }

      // Write installation log
      await this.writeInstallationLog(folderResults, fileResults);

      const successfulFolders = folderResults.filter(r => r.success).length;
      const successfulFiles = fileResults.filter(r => r.success).length;

      console.log(`✅ Fresh installation completed: ${successfulFolders}/${this.requiredFolders.length} folders, ${successfulFiles}/${this.blankDataFiles.length} files`);

      return {
        success: true,
        message: 'Fresh installation completed',
        details: {
          folders: { created: successfulFolders, total: this.requiredFolders.length },
          files: { created: successfulFiles, total: this.blankDataFiles.length },
          installPath: this.baseInstallPath
        }
      };

    } catch (error) {
      console.error('❌ Fresh installation failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create a single folder
   */
  async createFolder(folderName) {
    if (!window.electron?.ensureDirectory) {
      throw new Error('Electron directory API not available');
    }

    const folderPath = `${this.baseInstallPath}/${folderName}`;
    await window.electron.ensureDirectory(folderPath);
    console.log(`📁 Created folder: ${folderName}`);
  }

  /**
   * Create a base folder file
   */
  async createBaseFile(fileConfig) {
    if (!window.electron?.fs?.writeFile) {
      throw new Error('Electron FS API not available');
    }

    const filePath = `${this.baseInstallPath}/${fileConfig.file}`;
    
    let content;
    if (fileConfig.file.endsWith('.json')) {
      content = JSON.stringify(fileConfig.data, null, 2);
    } else {
      content = fileConfig.data;
    }

    await window.electron.fs.writeFile(filePath, content);
    console.log(`📄 Created base file: ${fileConfig.file}`);
  }
  
  /**
   * Create a module-specific file
   */
  async createModuleFile(moduleName, fileConfig) {
    if (!window.electron?.fs?.writeFile) {
      throw new Error('Electron FS API not available');
    }

    const filePath = `${this.baseInstallPath}/${moduleName}/${fileConfig.file}`;
    
    let content;
    if (fileConfig.file.endsWith('.json')) {
      content = JSON.stringify(fileConfig.data, null, 2);
    } else {
      content = fileConfig.data;
    }

    await window.electron.fs.writeFile(filePath, content);
    console.log(`📄 Created module file: ${moduleName}/${fileConfig.file}`);
  }

  /**
   * Get default application settings
   */
  getDefaultSettings() {
    return {
      version: "4.0.0",
      installation_date: new Date().toISOString(),
      database_path: this.baseInstallPath,
      auto_backup: true,
      backup_interval: 24,
      theme: "light",
      language: "en",
      company_info: {
        name: "",
        address: "",
        phone: "",
        email: "",
        gst_number: ""
      },
      features: {
        multi_user: false,
        online_sync: false,
        advanced_reporting: true,
        inventory_management: true,
        job_management: true
      },
      modules: {
        accounts: { enabled: true, initialized: true },
        customer: { enabled: true, initialized: true },
        inventory: { enabled: true, initialized: true },
        jobs: { enabled: true, initialized: true },
        labour: { enabled: true, initialized: true },
        settings: { enabled: true, initialized: true },
        summary: { enabled: true, initialized: true },
        supplier: { enabled: true, initialized: true },
        vendors: { enabled: true, initialized: true }
      }
    };
  }

  /**
   * Write installation log
   */
  async writeInstallationLog(folderResults, fileResults) {
    try {
      const logContent = [
        `=== Malwa CRM Windows Installation Log ===`,
        `Installation Date: ${new Date().toISOString()}`,
        `Installation Path: ${this.baseInstallPath}`,
        ``,
        `=== Folder Creation Results ===`,
        ...folderResults.map(r => `${r.success ? '✅' : '❌'} ${r.folder} ${r.error ? `- ${r.error}` : ''}`),
        ``,
        `=== File Creation Results ===`,
        ...fileResults.map(r => `${r.success ? '✅' : '❌'} ${r.file} ${r.error ? `- ${r.error}` : ''}`),
        ``,
        `=== Summary ===`,
        `Folders: ${folderResults.filter(r => r.success).length}/${folderResults.length}`,
        `Files: ${fileResults.filter(r => r.success).length}/${fileResults.length}`,
        `Status: ${folderResults.every(r => r.success) && fileResults.every(r => r.success) ? 'SUCCESS' : 'PARTIAL'}`,
        ``,
        `=== End Log ===`
      ].join('\n');

      const logPath = `${this.baseInstallPath}/logs/installation.log`;
      await window.electron.fs.writeFile(logPath, logContent);
      
    } catch (error) {
      console.error('❌ Failed to write installation log:', error);
    }
  }

  /**
   * Get installation status
   */
  async getInstallationStatus() {
    try {
      const exists = await this.checkInstallationExists();
      if (!exists) {
        return { installed: false, path: this.baseInstallPath };
      }

      // Count existing folders and files
      const folderCount = await this.countExistingFolders();
      const fileCount = await this.countExistingFiles();

      const totalExpectedFiles = this.getTotalExpectedFiles();
      
      return {
        installed: true,
        path: this.baseInstallPath,
        folders: { existing: folderCount, required: this.requiredFolders.length },
        files: { existing: fileCount, required: totalExpectedFiles },
        complete: folderCount === this.requiredFolders.length && fileCount === totalExpectedFiles
      };

    } catch (error) {
      return { installed: false, error: error.message };
    }
  }

  /**
   * Count existing folders
   */
  async countExistingFolders() {
    let count = 0;
    for (const folder of this.requiredFolders) {
      const folderPath = `${this.baseInstallPath}/${folder}`;
      const exists = await window.electron.fs.pathExists(folderPath);
      if (exists) count++;
    }
    return count;
  }

  /**
   * Count existing files
   */
  async countExistingFiles() {
    let count = 0;
    
    // Count base files
    for (const fileConfig of this.baseFiles) {
      const filePath = `${this.baseInstallPath}/${fileConfig.file}`;
      const exists = await window.electron.fs.pathExists(filePath);
      if (exists) count++;
    }
    
    // Count module files
    for (const [moduleName, moduleFiles] of Object.entries(this.moduleFiles)) {
      for (const fileConfig of moduleFiles) {
        const filePath = `${this.baseInstallPath}/${moduleName}/${fileConfig.file}`;
        const exists = await window.electron.fs.pathExists(filePath);
        if (exists) count++;
      }
    }
    
    return count;
  }
  
  /**
   * Get total expected files count
   */
  getTotalExpectedFiles() {
    let total = this.baseFiles.length;
    for (const moduleFiles of Object.values(this.moduleFiles)) {
      total += moduleFiles.length;
    }
    return total;
  }

  /**
   * Check if installation is complete
   */
  isInstallationComplete() {
    try {
      return this.installedStructure !== null && 
             this.installedStructure.status === 'complete';
    } catch (error) {
      console.error('❌ [INSTALLATION] Check failed:', error);
      return false;
    }
  }

  /**
   * Ensure installation is complete - main method called by unified managers
   */
  async ensureInstallationComplete() {
    try {
      console.log('🔄 [INSTALLATION] Ensuring installation is complete...');
      
      // Check if already completed
      if (this.isInstallationComplete()) {
        console.log('✅ [INSTALLATION] Already complete');
        return {
          success: true,
          status: 'already_complete',
          message: 'Installation already complete'
        };
      }

      // Run setup and validation
      const setupResult = await this.checkAndSetupInstallation();
      
      if (setupResult.success) {
        this.installedStructure = {
          status: 'complete',
          completedAt: new Date().toISOString(),
          mode: setupResult.mode || 'electron',
          ...setupResult
        };
        
        console.log('✅ [INSTALLATION] Installation ensured successfully');
        return {
          success: true,
          status: 'completed',
          message: 'Installation completed successfully',
          details: setupResult
        };
      } else {
        // Even if setup failed, mark as complete for browser mode to avoid blocking
        console.warn('⚠️ [INSTALLATION] Setup returned failure, but continuing for browser mode');
        this.installedStructure = {
          status: 'complete',
          mode: 'browser-fallback',
          completedAt: new Date().toISOString(),
          warning: setupResult.message || setupResult.error
        };
        
        return {
          success: true,
          status: 'browser_mode',
          message: 'Running in browser mode without file system',
          warning: setupResult.message || setupResult.error
        };
      }
    } catch (error) {
      console.error('❌ [INSTALLATION] Ensure installation failed:', error);
      
      // Don't block app startup - allow browser mode
      this.installedStructure = {
        status: 'complete',
        mode: 'browser-error-fallback',
        completedAt: new Date().toISOString(),
        error: error.message
      };
      
      return {
        success: true,
        status: 'browser_fallback',
        message: 'Running in browser mode (error fallback)',
        error: error.message
      };
    }
  }

  /**
   * Get installation status details
   */
  getInstallationStatus() {
    return {
      complete: this.isInstallationComplete(),
      structure: this.installedStructure,
      basePath: this.baseInstallPath,
      requiredFolders: this.requiredFolders,
      isFirstRun: this.isFirstRun
    };
  }

  /**
   * Reset installation state (for testing or reinstallation)
   */
  resetInstallationState() {
    this.installedStructure = null;
    this.isFirstRun = false;
    console.log('🔄 [INSTALLATION] State reset');
  }
}

// Create and export singleton instance
const windowsInstallationManager = new WindowsInstallationManager();
export default windowsInstallationManager;