/**
 * Page-based Data Manager
 * Manages data organization based on src/pages structure and indexeddb_file_mapping.json
 */

import enhancedDbOperations from './enhancedDbOperations';
import pathManager from './pathManager.js';

class PageDataManager {
  constructor() {
    this.dbOps = enhancedDbOperations;
    this.pathManager = pathManager;
    
    // Page to store mapping based on src/pages structure
    this.pageStoreMapping = {
      // Main pages
      dashboard: ['dashboard', 'summary'],
      accounts: ['accounts'],
      customer: ['customers'], 
      inventory: ['inventory'],
      jobs: ['jobs'],
      labour: ['labour'],
      settings: ['settings'],
      supplier: ['suppliers'],
      vendors: ['vendors'],
      summary: ['summary'],
      
      // Sub-pages from accounts/
      'accounts/CashReceipt': ['accounts'],
      'accounts/Challan': ['accounts'], 
      'accounts/Gstledger': ['accounts'],
      'accounts/Invoice': ['accounts'],
      'accounts/OtherExpenses': ['accounts'],
      'accounts/Purchase': ['accounts'],

      'accounts/Sellchallan': ['accounts'],
      'accounts/Voucher': ['accounts'],
      
      // Sub-pages from customer/
      'customer/CustomerDetailsTab': ['customers'],
      'customer/CustomerLedgerTab': ['customers'],
      'customer/LeadsTab': ['customers'],
      
      // Sub-pages from inventory/
      'inventory/CategoryManager': ['inventory'],
      'inventory/StockMovements': ['inventory'],
      'inventory/StockTab': ['inventory'],
      
      // Sub-pages from jobs/
      'jobs/ChalanStep': ['jobs'],
      'jobs/EstimateStep': ['jobs'],
      'jobs/InspectionStep': ['jobs'],
      'jobs/InvoiceStep': ['jobs'],
      'jobs/JobSheetStep': ['jobs'],
      
      // Sub-pages from labour/
      'labour/LabourDetailsTab': ['labour'],
      'labour/LabourLedgerTab': ['labour'],
      'labour/LabourLedgerView': ['labour'],
      
      // Sub-pages from settings/
      'settings/AboutTab': ['settings'],
      'settings/AuditLogsTab': ['settings'],
      'settings/BackupSettingsTab': ['settings'],
      'settings/CompanyMasterTab': ['settings'],
      'settings/GeneralSettingsTab': ['settings'],
      'settings/InventorySettingsTab': ['inventory', 'settings'],
      'settings/InvoiceSettingsTab': ['accounts', 'settings'],
      'settings/LedgerSettingsTab': ['accounts', 'settings'],
      'settings/MultiplierSettingsTab': ['settings'],
      'settings/MyProfileTab': ['settings'],
      'settings/RateListMemoryTab': ['settings'],
      'settings/SecuritySettingsTab': ['settings'],
      'settings/UserManagementTab': ['settings'],
      
      // Sub-pages from summary/
      'summary/IncentiveSummary': ['summary', 'labour'],
      'summary/PenaltyCard': ['summary'],
      'summary/SummaryDashboard': ['summary', 'dashboard'],
      
      // Sub-pages from supplier/
      'supplier/SupplierDetailsTab': ['suppliers'],
      'supplier/SupplierLedger': ['suppliers'],
      'supplier/SupplierLedgerTab': ['suppliers'],
      
      // Sub-pages from vendors/
      'vendors/VendorDetailsTab': ['vendors'],
      'vendors/VendorLedgerTab': ['vendors']
    };

    // Role-based permissions
    this.rolePermissions = {
      super_admin: {
        pages: '*', // All pages
        operations: ['create', 'read', 'update', 'delete', 'admin']
      },
      admin: {
        pages: ['dashboard', 'accounts', 'customer', 'inventory', 'jobs', 'labour', 'settings', 'supplier', 'vendors', 'summary'],
        operations: ['create', 'read', 'update', 'delete']
      },
      manager: {
        pages: ['dashboard', 'customer', 'jobs', 'inventory', 'labour', 'summary'],
        operations: ['create', 'read', 'update']
      },
      accountant: {
        pages: ['dashboard', 'accounts', 'customer', 'supplier', 'vendors', 'summary'],
        operations: ['create', 'read', 'update']
      },
      employee: {
        pages: ['dashboard', 'customer', 'jobs', 'inventory'],
        operations: ['create', 'read', 'update']
      },
      read_only: {
        pages: ['dashboard', 'customer', 'jobs', 'summary'],
        operations: ['read']
      }
    };
  }

  // Get page data based on page path and user role
  async getPageData(pagePath, userRole = 'read_only') {
    try {
      console.log(`📄 Getting page data for: ${pagePath} (Role: ${userRole})`);
      
      // Check if user has access to this page
      if (!this.hasPageAccess(pagePath, userRole)) {
        console.warn(`🚫 Access denied for ${userRole} to page: ${pagePath}`);
        return { error: 'Access denied', data: {} };
      }

      // Get stores needed for this page
      const stores = this.getPageStores(pagePath);
      const pageData = {};

      // Load data from each required store
      for (const storeName of stores) {
        try {
          let storeData = await this.dbOps.getAll(storeName);
          
          // Apply role-based filtering
          storeData = this.filterDataByRole(storeData, userRole, storeName);
          
          pageData[storeName] = storeData;
          console.log(`📊 Loaded ${storeName} data: ${storeData?.length || 0} records`);
        } catch (error) {
          console.error(`❌ Failed to load ${storeName}:`, error);
          pageData[storeName] = [];
        }
      }

      return {
        success: true,
        page: pagePath,
        role: userRole,
        data: pageData,
        metadata: {
          loaded_at: new Date().toISOString(),
          stores: stores,
          record_counts: Object.entries(pageData).reduce((acc, [key, value]) => {
            acc[key] = Array.isArray(value) ? value.length : 0;
            return acc;
          }, {})
        }
      };
    } catch (error) {
      console.error(`❌ Failed to get page data for ${pagePath}:`, error);
      return { error: error.message, data: {} };
    }
  }

  // Get stores required for a specific page
  getPageStores(pagePath) {
    // Normalize page path
    const normalizedPath = pagePath.toLowerCase().replace(/^\/+|\/+$/g, '');
    
    // Check direct mapping first
    if (this.pageStoreMapping[normalizedPath]) {
      return this.pageStoreMapping[normalizedPath];
    }

    // Check if it's a main page
    const mainPage = normalizedPath.split('/')[0];
    if (this.pageStoreMapping[mainPage]) {
      return this.pageStoreMapping[mainPage];
    }

    // Default fallback
    console.warn(`⚠️ No store mapping found for page: ${pagePath}, using default`);
    return [mainPage];
  }

  // Check if user has access to specific page
  hasPageAccess(pagePath, userRole) {
    const permissions = this.rolePermissions[userRole];
    
    if (!permissions) {
      return false;
    }

    // Super admin has access to all pages
    if (permissions.pages === '*') {
      return true;
    }

    // Check main page access
    const mainPage = pagePath.toLowerCase().split('/')[0];
    return permissions.pages.includes(mainPage);
  }

  // Filter data based on user role and data sensitivity
  filterDataByRole(data, userRole, storeName) {
    if (!Array.isArray(data) || userRole === 'super_admin') {
      return data;
    }

    const permissions = this.rolePermissions[userRole];
    if (!permissions) {
      return [];
    }

    return data.map(item => {
      const filteredItem = { ...item };

      // Role-specific filtering
      switch (userRole) {
        case 'read_only':
          // Remove sensitive financial data
          delete filteredItem.cost;
          delete filteredItem.profit_margin;
          delete filteredItem.salary;
          delete filteredItem.commission;
          break;
          
        case 'employee':
          // Limited access to customer financial data
          if (storeName === 'customers') {
            delete filteredItem.credit_limit;
            delete filteredItem.outstanding_amount;
          }
          break;
          
        case 'accountant':
          // Accountants can see financial data but not internal operations
          if (storeName === 'labour') {
            delete filteredItem.performance_notes;
          }
          break;
      }

      return filteredItem;
    });
  }

  // Save page data with role verification
  async savePageData(pagePath, storeName, data, userRole) {
    try {
      // Check permissions
      const permissions = this.rolePermissions[userRole];
      if (!permissions || !permissions.operations.includes('create') && !permissions.operations.includes('update')) {
        throw new Error('Insufficient permissions for save operation');
      }

      // Check page access
      if (!this.hasPageAccess(pagePath, userRole)) {
        throw new Error('Access denied to this page');
      }

      // Save data
      const result = await this.dbOps.add(storeName, data);
      
      console.log(`💾 Saved data to ${storeName} from page ${pagePath} by ${userRole}`);
      return result;
    } catch (error) {
      console.error(`❌ Failed to save page data:`, error);
      throw error;
    }
  }

  // Initialize page-based file structure
  async initializePageStructure() {
    try {
      console.log('🏗️ Initializing page-based file structure...');
      
      // Initialize the enhanced db operations file structure
      const result = await this.dbOps.initializeFileStructure();
      
      if (result) {
        console.log('✅ Page-based file structure initialized successfully');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Failed to initialize page structure:', error);
      return false;
    }
  }

  // Get accessible pages for a user role
  getAccessiblePages(userRole) {
    const permissions = this.rolePermissions[userRole];
    
    if (!permissions) {
      return [];
    }

    if (permissions.pages === '*') {
      return Object.keys(this.pageStoreMapping);
    }

    return permissions.pages;
  }

  // Get page navigation structure based on role
  getPageNavigation(userRole) {
    const accessiblePages = this.getAccessiblePages(userRole);
    
    const navigation = {
      main_pages: [],
      sub_pages: {}
    };

    // Main pages
    const mainPages = ['dashboard', 'accounts', 'customer', 'inventory', 'jobs', 'labour', 'settings', 'supplier', 'vendors', 'summary'];
    
    navigation.main_pages = mainPages.filter(page => accessiblePages.includes(page));

    // Sub-pages for each main page
    for (const mainPage of navigation.main_pages) {
      navigation.sub_pages[mainPage] = Object.keys(this.pageStoreMapping)
        .filter(pagePath => pagePath.startsWith(mainPage + '/'))
        .filter(pagePath => this.hasPageAccess(pagePath, userRole));
    }

    return navigation;
  }

  // Bulk sync all page data to file system
  async syncAllPageData() {
    try {
      console.log('🔄 Starting bulk sync of all page data...');
      
      const result = await this.dbOps.fullSync();
      
      if (result) {
        console.log('✅ All page data synced successfully:', result);
        return result;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Failed to sync all page data:', error);
      return false;
    }
  }

  // Get sync status for all pages
  async getPageSyncStatus() {
    try {
      const status = await this.dbOps.getFileSystemStatus();
      
      return {
        ...status,
        page_mapping: {
          total_pages: Object.keys(this.pageStoreMapping).length,
          main_pages: ['dashboard', 'accounts', 'customer', 'inventory', 'jobs', 'labour', 'settings', 'supplier', 'vendors', 'summary'].length,
          mapped_stores: [...new Set(Object.values(this.pageStoreMapping).flat())].length
        }
      };
    } catch (error) {
      console.error('❌ Failed to get page sync status:', error);
      return { available: false, reason: error.message };
    }
  }

  // Create user workspace with page-specific structure
  async createUserWorkspace(userData) {
    try {
      console.log(`👤 Creating workspace for user: ${userData.username} (${userData.role})`);
      
      if (!window.electron?.fs) {
        console.warn('⚠️ File system not available for workspace creation');
        return false;
      }

      const userWorkspacePath = this.pathManager.getUserWorkspacePath(userData.id);
      
      // Create user directory
      await window.electron.ensureDirectory(userWorkspacePath);
      
      // Create page-specific directories based on user role
      const accessiblePages = this.getAccessiblePages(userData.role);
      const mainPages = ['dashboard', 'accounts', 'customer', 'inventory', 'jobs', 'labour', 'settings', 'supplier', 'vendors', 'summary'];
      
      for (const page of mainPages) {
        if (accessiblePages.includes(page)) {
          const pageDir = `${userWorkspacePath}/${page}`;
          await window.electron.ensureDirectory(pageDir);
          
          // Create user-specific data file for the page
          const userDataFile = {
            user_id: userData.id,
            username: userData.username,
            role: userData.role,
            page: page,
            created_at: new Date().toISOString(),
            data: [],
            preferences: {},
            last_accessed: null
          };
          
          await window.electron.fs.writeFile(
            `${pageDir}/user_data.json`,
            JSON.stringify(userDataFile, null, 2)
          );
        }
      }

      // Create user profile file
      const profileData = {
        ...userData,
        workspace_path: userWorkspacePath,
        accessible_pages: accessiblePages,
        created_at: new Date().toISOString(),
        workspace_version: "2.0.0"
      };

      await window.electron.fs.writeFile(
        `${userWorkspacePath}/user_profile.json`,
        JSON.stringify(profileData, null, 2)
      );

      console.log(`✅ User workspace created: ${userWorkspacePath}`);
      return {
        success: true,
        workspace_path: userWorkspacePath,
        accessible_pages: accessiblePages
      };
      
    } catch (error) {
      console.error('❌ Failed to create user workspace:', error);
      return false;
    }
  }
}

// Create singleton instance
const pageDataManager = new PageDataManager();

export default pageDataManager;