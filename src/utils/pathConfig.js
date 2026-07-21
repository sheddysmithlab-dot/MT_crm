/**
 * Centralized Path Configuration
 * Reads from indexeddb_file_mapping.json to ensure consistency
 */

let mappingConfig = null;

// Initialize path configuration
export const initPathConfig = async () => {
  if (!mappingConfig) {
    // Always use electron configuration in this desktop app
    mappingConfig = getElectronConfig();
  }
  return mappingConfig;
};

// Get electron-specific configuration
const getElectronConfig = () => [
  {
    "target_folder": "C:/malwa-crm/Data_base",
    "files": [
      "meta.json", "Accounts.json", "CashReceipt.json", "Customer.json",
      "DailyTasks.json", "Dashboard.json", "Inventory.json", "Jobs.json",
      "Labour.json", "Login.json", "Settings.json", "Summary.json",
      "Supplier.json", "Vendors.json", "SyncQueue.json",
      "JobOperationsQueue.json", "UserPageVisibility.json"
    ]
  },
  {
    "target_folder": "C:/malwa-crm/Data_base/customer",
    "files": ["customer.json", "meta.json", "CustomerDetailsTab.json", "CustomerLedgerTab.json", "LeadsTab.json"]
  },
  {
    "target_folder": "C:/malwa-crm/Data_base/jobs", 
    "files": ["jobs.json", "meta.json", "ChalanStep.json", "EstimateStep.json", "InspectionStep.json", "InvoiceStep.json", "JobSheetStep.json"]
  },
  {
    "target_folder": "C:/malwa-crm/Data_base/supplier",
    "files": ["supplier.json", "meta.json", "SupplierDetailsTab.json", "SupplierLedgerTab.json"]
  },
  {
    "target_folder": "C:/malwa-crm/Data_base/vendors",
    "files": ["vendors.json", "meta.json", "VendorDetailsTab.json", "VendorLedgerTab.json"]
  },
  {
    "target_folder": "C:/malwa-crm/Data_base/labour",
    "files": ["labour.json", "meta.json", "LabourDetailsTab.json", "LabourLedgerTab.json", "LabourLedgerView.json"]
  },
  {
    "target_folder": "C:/malwa-crm/Data_base/inventory",
    "files": ["inventory.json", "meta.json", "CategoryManager.json", "StockMovements.json", "StockTab.json"]
  },
  {
    "target_folder": "C:/malwa-crm/Data_base/accounts",
    "files": ["accounts.json", "meta.json", "CashReceipt.json", "Challan.json", "Gstledger.json", "Invoice.json", "OtherExpenses.json", "Purchase.json", "Sellchallan.json", "Voucher.json"]
  },
  {
    "target_folder": "C:/malwa-crm/Data_base/settings",
    "files": ["settings.json", "meta.json", "AboutTab.json", "AuditLogsTab.json", "BackupSettingsTab.json", "CompanyMasterTab.json", "GeneralSettingsTab.json", "InventorySettingsTab.json", "InvoiceSettingsTab.json", "LedgerSettingsTab.json", "MultiplierSettingsTab.json", "MyProfileTab.json", "RateListMemoryTab.json", "SecuritySettingsTab.json", "UserManagementTab.json", "RateHistory.json", "Templates.json", "Roles.json", "Permissions.json", "Taxes.json", "HsnCodes.json", "AuditLogs.json", "Sequences.json"]
  },
  {
    "target_folder": "C:/malwa-crm/Data_base/summary",
    "files": ["summary.json", "meta.json", "IncentiveSummary.json", "PenaltyCard.json", "SummaryDashboard.json"]
  }
];

// Get default configuration (same as electron for consistency)
const getDefaultConfig = () => getElectronConfig();

// Get base database path
export const getBasePath = async () => {
  await initPathConfig();
  return mappingConfig[0].target_folder; // 'C:/malwa-crm/Data_base'
};

// Get module-specific path
export const getModulePath = async (module) => {
  await initPathConfig();
  const mapping = mappingConfig.find(m => 
    m.target_folder.includes(`/${module}`)
  );
  return mapping?.target_folder || `C:/malwa-crm/Data_base/${module}`;
};

// Get all module paths
export const getAllModulePaths = async () => {
  await initPathConfig();
  const paths = {};
  mappingConfig.forEach(config => {
    const folderName = config.target_folder.split('/').pop();
    if (folderName !== 'Data_base') {
      paths[folderName] = config.target_folder;
    }
  });
  return paths;
};

// Get files for a specific module
export const getModuleFiles = async (module) => {
  await initPathConfig();
  const mapping = mappingConfig.find(m => 
    m.target_folder.includes(`/${module}`)
  );
  return mapping?.files || [];
};

// Utility function to construct file path
export const getFilePath = async (module, fileName) => {
  const modulePath = await getModulePath(module);
  return `${modulePath}/${fileName}`;
};

// Check if module exists in configuration
export const moduleExists = async (module) => {
  await initPathConfig();
  return mappingConfig.some(m => m.target_folder.includes(`/${module}`));
};

// Get configuration for debugging
export const getFullConfig = async () => {
  await initPathConfig();
  return mappingConfig;
};

export default {
  initPathConfig,
  getBasePath,
  getModulePath,
  getAllModulePaths,
  getModuleFiles,
  getFilePath,
  moduleExists,
  getFullConfig
};