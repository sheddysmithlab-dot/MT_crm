/**
 * Malwa CRM File-Based Data Manager
 * Handles IndexedDB to File System mapping based on page structure
 */

import { dbOperations } from '@/lib/db';
import pathConfig from './pathConfig.js';

class FileBasedDataManager {
  constructor() {
    this.basePath = null;
    this.mapping = null;
    this.initializeMapping();
  }

  // Initialize file mapping from pathConfig
  async initializeMapping() {
    try {
      // Initialize path configuration and get mapping
      await pathConfig.initPathConfig();
      this.basePath = await pathConfig.getBasePath();
      this.mapping = await pathConfig.getFullConfig();
      console.log('📂 File mapping initialized:', this.mapping);
      console.log('📁 Base path set to:', this.basePath);
    } catch (error) {
      console.error('❌ Failed to load file mapping:', error);
      // Fallback path
      this.basePath = 'C:/malwa-crm/Data_base';
      this.mapping = [{
        "target_folder": "C:/malwa-crm/Data_base",
        "files": ["meta.json", "Dashboard.json", "Login.json"]
      }];
    }
  }

  // Get file mapping for specific module
  getModuleMapping(moduleName) {
    if (!this.mapping) return null;
    
    const lowerModuleName = moduleName.toLowerCase();
    return this.mapping.find(item => 
      item.target_folder.includes(`/${lowerModuleName}`) || 
      item.target_folder.endsWith('Data_base') && lowerModuleName === 'root'
    );
  }

  // Create directory structure based on mapping
  async initializeFileStructure() {
    if (!this.mapping || !window.electron?.fs) {
      console.warn('⚠️ File system not available or mapping not loaded');
      return false;
    }

    try {
      console.log('🏗️ Creating file structure...');
      
      for (const module of this.mapping) {
        const folderPath = module.target_folder;
        
        // Create directory
        const result = await window.electron.ensureDirectory(folderPath);
        if (!result.success) {
          throw new Error(`Failed to create directory: ${result.error}`);
        }
        console.log(`📁 Created directory: ${folderPath}`);
        
        // Create placeholder files
        for (const fileName of module.files) {
          const filePath = `${folderPath}/${fileName}`;
          const defaultContent = this.getDefaultFileContent(fileName, module);
          
          try {
            await window.electron.fs.writeFile(filePath, JSON.stringify(defaultContent, null, 2));
            console.log(`📄 Created file: ${filePath}`);
          } catch (fileError) {
            console.warn(`⚠️ Could not create file ${filePath}:`, fileError);
          }
        }
      }
      
      console.log('✅ File structure creation completed');
      return true;
    } catch (error) {
      console.error('❌ Failed to create file structure:', error);
      return false;
    }
  }

  // Get default content for different file types
  getDefaultFileContent(fileName, module) {
    const timestamp = new Date().toISOString();
    const moduleName = module.target_folder.split('/').pop();

    if (fileName === 'meta.json') {
      return {
        module: moduleName,
        created_at: timestamp,
        last_updated: timestamp,
        version: "2.0.0",
        file_count: module.files.length - 1, // Excluding meta.json
        sync_status: "initialized",
        google_drive_sync: false
      };
    }

    // Default structure for data files
    return {
      module: moduleName,
      file_type: fileName.replace('.json', ''),
      data: [],
      metadata: {
        created_at: timestamp,
        last_updated: timestamp,
        record_count: 0,
        version: "2.0.0"
      },
      sync_info: {
        last_sync: null,
        google_drive_id: null,
        local_changes: false
      }
    };
  }

  // Save IndexedDB data to file system
  async saveToFileSystem(storeName, data, subModule = null) {
    if (!window.electron?.fs || !this.mapping) {
      console.warn('⚠️ File system or mapping not available');
      return false;
    }

    try {
      const moduleMapping = this.getModuleMapping(subModule || storeName);
      if (!moduleMapping) {
        console.warn(`⚠️ No mapping found for: ${storeName}`);
        return false;
      }

      const fileName = `${storeName}.json`;
      const filePath = `${moduleMapping.target_folder}/${fileName}`;
      
      const fileContent = {
        module: storeName,
        file_type: storeName,
        data: Array.isArray(data) ? data : [data],
        metadata: {
          created_at: new Date().toISOString(),
          last_updated: new Date().toISOString(),
          record_count: Array.isArray(data) ? data.length : 1,
          version: "2.0.0"
        },
        sync_info: {
          last_sync: new Date().toISOString(),
          google_drive_id: null,
          local_changes: true
        }
      };

      await window.electron.fs.writeFile(filePath, JSON.stringify(fileContent, null, 2));
      
      // Update meta.json
      await this.updateMetaFile(moduleMapping.target_folder, storeName);
      
      console.log(`💾 Saved ${storeName} to file system: ${filePath}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to save ${storeName} to file system:`, error);
      return false;
    }
  }

  // Load data from file system
  async loadFromFileSystem(storeName, subModule = null) {
    if (!window.electron?.fs || !this.mapping) {
      console.warn('⚠️ File system or mapping not available');
      return null;
    }

    try {
      const moduleMapping = this.getModuleMapping(subModule || storeName);
      if (!moduleMapping) {
        console.warn(`⚠️ No mapping found for: ${storeName}`);
        return null;
      }

      const fileName = `${storeName}.json`;
      const filePath = `${moduleMapping.target_folder}/${fileName}`;
      
      const fileContent = await window.electron.fs.readFile(filePath);
      const parsedContent = JSON.parse(fileContent);
      
      console.log(`📖 Loaded ${storeName} from file system: ${filePath}`);
      return parsedContent.data || [];
    } catch (error) {
      console.warn(`⚠️ Could not load ${storeName} from file system:`, error);
      return null;
    }
  }

  // Update meta file for a module
  async updateMetaFile(folderPath, updatedStore) {
    try {
      const metaPath = `${folderPath}/meta.json`;
      const timestamp = new Date().toISOString();
      
      let metaContent;
      try {
        const existingMeta = await window.electron.fs.readFile(metaPath);
        metaContent = JSON.parse(existingMeta);
      } catch {
        metaContent = this.getDefaultFileContent('meta.json', { target_folder: folderPath, files: [] });
      }
      
      metaContent.last_updated = timestamp;
      metaContent.last_updated_store = updatedStore;
      
      await window.electron.fs.writeFile(metaPath, JSON.stringify(metaContent, null, 2));
      console.log(`📝 Updated meta file: ${metaPath}`);
    } catch (error) {
      console.error('❌ Failed to update meta file:', error);
    }
  }

  // Sync IndexedDB with File System
  async syncIndexedDBToFiles() {
    if (!this.mapping) {
      console.warn('⚠️ Mapping not loaded, cannot sync');
      return false;
    }

    console.log('🔄 Starting IndexedDB to File System sync...');
    
    try {
      // Get all stores from IndexedDB
      const stores = [
        'accounts', 'customers', 'inventory', 'jobs', 
        'labour', 'settings', 'suppliers', 'vendors',
        'dashboard', 'summary'
      ];

      let syncResults = {
        successful: [],
        failed: []
      };

      for (const store of stores) {
        try {
          const data = await dbOperations.getAll(store);
          if (data && data.length > 0) {
            const success = await this.saveToFileSystem(store, data);
            if (success) {
              syncResults.successful.push(store);
            } else {
              syncResults.failed.push(store);
            }
          }
        } catch (error) {
          console.warn(`⚠️ Could not sync ${store}:`, error);
          syncResults.failed.push(store);
        }
      }

      console.log('📊 Sync Results:', syncResults);
      return syncResults;
    } catch (error) {
      console.error('❌ Sync failed:', error);
      return false;
    }
  }

  // Get sync status
  async getSyncStatus() {
    if (!this.mapping || !window.electron?.fs) {
      return {
        available: false,
        reason: 'File system or mapping not available'
      };
    }

    try {
      const status = {
        available: true,
        modules: {},
        overall_health: 'good'
      };

      for (const module of this.mapping) {
        const metaPath = `${module.target_folder}/meta.json`;
        try {
          const metaContent = await window.electron.fs.readFile(metaPath);
          const metaData = JSON.parse(metaContent);
          status.modules[module.target_folder.split('/').pop()] = {
            status: 'active',
            last_updated: metaData.last_updated,
            file_count: metaData.file_count
          };
        } catch {
          status.modules[module.target_folder.split('/').pop()] = {
            status: 'not_initialized',
            last_updated: null,
            file_count: 0
          };
          status.overall_health = 'needs_attention';
        }
      }

      return status;
    } catch (error) {
      console.error('❌ Failed to get sync status:', error);
      return {
        available: false,
        reason: error.message
      };
    }
  }

  // Prepare for Google Drive sync
  async prepareGoogleDriveSync() {
    console.log('☁️ Preparing Google Drive sync...');
    
    const syncMetadata = {
      created_at: new Date().toISOString(),
      malwa_crm_version: "2.0.0",
      sync_strategy: "incremental",
      conflict_resolution: "timestamp_based",
      modules: {}
    };

    // Add module information
    for (const module of this.mapping || []) {
      const moduleName = module.target_folder.split('/').pop();
      syncMetadata.modules[moduleName] = {
        folder_path: module.target_folder,
        files: module.files,
        google_drive_folder_id: null,
        last_sync: null
      };
    }

    if (window.electron?.fs) {
      try {
        const syncPath = `${this.basePath}/GoogleDrive_Sync`;
        const result = await window.electron.ensureDirectory(syncPath);
        if (!result.success) {
          throw new Error(`Failed to create sync directory: ${result.error}`);
        }
        await window.electron.fs.writeFile(
          `${syncPath}/sync_metadata.json`, 
          JSON.stringify(syncMetadata, null, 2)
        );
        console.log('✅ Google Drive sync metadata created');
        return true;
      } catch (error) {
        console.error('❌ Failed to create Google Drive sync metadata:', error);
      }
    }
    
    return false;
  }
}

// Create singleton instance
const fileDataManager = new FileBasedDataManager();

export default fileDataManager;