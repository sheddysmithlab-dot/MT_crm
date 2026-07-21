/**
 * 📋 Malwa CRM v2.0.0 - Complete Database Files List
 * 
 * यह file आपके CRM system में सभी database files और tables की complete list है
 * Database structure, file locations, और data organization के साथ
 */

// ===============================================
// 🗄️ MAIN DATABASE STORES (IndexedDB Tables)
// ===============================================

export const DATABASE_STORES = {
  // 👥 CUSTOMER MODULE
  customers: {
    description: "ग्राहक डेटा (Customer Information)",
    fields: ["id", "name", "phone", "email", "address", "gstin", "type", "category", "creditLimit", "outstandingBalance"],
    indexes: ["phone", "email", "gstin", "type", "created_at"],
    sample_count: 5
  },
  
  customer_ledger_entries: {
    description: "ग्राहक खाता बही (Customer Account Ledger)",
    fields: ["id", "customer_id", "date", "description", "debit", "credit", "balance"],
    indexes: ["customer_id", "date"],
    sample_count: 15
  },
  
  // 🚗 JOBS MODULE
  jobs: {
    description: "जॉब्स और कार्य (Jobs & Work Orders)",
    fields: ["id", "jobNumber", "customerId", "vehicleNumber", "vehicleModel", "serviceType", "status", "estimatedCost", "actualCost"],
    indexes: ["customerId", "status", "jobNumber", "scheduledStart", "created_at"],
    sample_count: 5
  },
  
  estimates: {
    description: "अनुमान पत्र (Job Estimates)",
    fields: ["id", "jobId", "customerId", "items", "subtotal", "tax", "total", "status"],
    indexes: ["jobId", "customerId", "date"],
    sample_count: 5
  },
  
  jobsheets: {
    description: "जॉब शीट (Work Sheets)",
    fields: ["id", "jobId", "technicianId", "tasks", "parts_used", "labour_hours", "status"],
    indexes: ["jobId", "technicianId", "date"],
    sample_count: 8
  },
  
  inspections: {
    description: "निरीक्षण रिपोर्ट (Vehicle Inspections)",
    fields: ["id", "jobId", "vehicleCondition", "issues", "recommendations", "inspector"],
    indexes: ["jobId", "date"],
    sample_count: 3
  },
  
  // 🏭 INVENTORY MODULE
  inventory: {
    description: "इन्वेंटरी और स्टॉक (Inventory & Stock)",
    fields: ["id", "code", "name", "category", "brand", "unit", "currentStock", "minimumStock", "unitPrice", "sellingPrice"],
    indexes: ["code", "category", "brand"],
    sample_count: 5
  },
  
  stock_movements: {
    description: "स्टॉक मूवमेंट (Stock Transactions)",
    fields: ["id", "item_id", "movement_type", "quantity", "unit_price", "total_value", "reference"],
    indexes: ["item_id", "movement_type", "date"],
    sample_count: 12
  },
  
  // 🔧 LABOUR MODULE
  labour: {
    description: "श्रमिक और कर्मचारी (Labour & Employees)",
    fields: ["id", "name", "employeeId", "designation", "department", "phone", "hourlyRate", "skills", "status"],
    indexes: ["employeeId", "department", "status"],
    sample_count: 5
  },
  
  labour_attendance: {
    description: "श्रमिक उपस्थिति (Labour Attendance)",
    fields: ["id", "labour_id", "date", "check_in", "check_out", "hours_worked", "overtime_hours", "status"],
    indexes: ["labour_id", "date", "status"],
    sample_count: 25
  },
  
  labour_ledger_entries: {
    description: "श्रमिक खाता बही (Labour Account Ledger)",
    fields: ["id", "labour_id", "date", "description", "debit", "credit", "balance"],
    indexes: ["labour_id", "date"],
    sample_count: 15
  },
  
  // 🏪 VENDORS MODULE
  vendors: {
    description: "वेंडर्स और आपूर्तिकर्ता (Vendors & Service Providers)",
    fields: ["id", "code", "name", "contactPerson", "phone", "email", "address", "serviceType", "category"],
    indexes: ["code", "serviceType", "category"],
    sample_count: 5
  },
  
  vendor_ledger_entries: {
    description: "वेंडर खाता बही (Vendor Account Ledger)",
    fields: ["id", "vendor_id", "date", "description", "debit", "credit", "balance"],
    indexes: ["vendor_id", "date"],
    sample_count: 15
  },
  
  // 🏢 SUPPLIERS MODULE
  suppliers: {
    description: "सप्लायर्स (Material Suppliers)",
    fields: ["id", "code", "name", "contactPerson", "phone", "email", "address", "category", "paymentTerms"],
    indexes: ["code", "category"],
    sample_count: 5
  },
  
  supplier_ledger_entries: {
    description: "सप्लायर खाता बही (Supplier Account Ledger)",
    fields: ["id", "supplier_id", "date", "description", "debit", "credit", "balance"],
    indexes: ["supplier_id", "date"],
    sample_count: 15
  },
  
  // 💰 ACCOUNTS MODULE
  accounts: {
    description: "खाते और लेखांकन (Accounts & Finance)",
    fields: ["id", "accountCode", "accountName", "accountType", "currentBalance", "openingBalance", "isActive"],
    indexes: ["accountCode", "accountType"],
    sample_count: 5
  },
  
  invoices: {
    description: "बिल और चालान (Invoices)",
    fields: ["id", "invoice_no", "customer_id", "date", "items", "subtotal", "tax", "total", "status"],
    indexes: ["customer_id", "invoice_no", "date", "status"],
    sample_count: 8
  },
  
  payments: {
    description: "भुगतान रिकॉर्ड (Payment Records)",
    fields: ["id", "invoiceId", "payeeId", "payeeType", "amount", "payment_method", "date", "status"],
    indexes: ["invoiceId", "payeeId", "payeeType", "date"],
    sample_count: 12
  },
  
  journal_entries: {
    description: "जर्नल एंट्रीज (Journal Entries)",
    fields: ["id", "entry_no", "date", "description", "total_debit", "total_credit", "status"],
    indexes: ["entry_no", "date"],
    sample_count: 10
  },
  
  journal_lines: {
    description: "जर्नल लाइन्स (Journal Entry Lines)",
    fields: ["id", "journal_entry_id", "account_id", "account_name", "debit", "credit", "description"],
    indexes: ["journal_entry_id", "account_id"],
    sample_count: 20
  },
  
  // 📊 SUMMARY & REPORTS MODULE
  summary: {
    description: "सारांश और रिपोर्ट्स (Summary & Analytics)",
    fields: ["id", "type", "date", "value", "description", "category"],
    indexes: ["type", "date", "category"],
    sample_count: 5
  },
  
  // ⚙️ SETTINGS MODULE
  settings: {
    description: "सिस्टम सेटिंग्स (System Settings)",
    fields: ["id", "key", "value", "category", "description", "dataType", "isEditable"],
    indexes: ["key", "category"],
    sample_count: 5
  },
  
  // 👤 USER MANAGEMENT
  users: {
    description: "उपयोगकर्ता प्रबंधन (User Management)",
    fields: ["id", "username", "email", "role", "permissions", "status", "last_login"],
    indexes: ["username", "email", "role"],
    sample_count: 3
  },
  
  // 🏢 COMPANY & ORGANIZATION
  companies: {
    description: "कंपनी विवरण (Company Details)",
    fields: ["id", "name", "address", "phone", "email", "gstin", "logo", "settings"],
    indexes: ["gstin"],
    sample_count: 1
  },
  
  // 📄 DOCUMENTS & FILES
  documents: {
    description: "दस्तावेज़ और फाइलें (Documents & Files)",
    fields: ["id", "entity_type", "entity_id", "file_name", "file_path", "file_type", "file_size"],
    indexes: ["entity_type", "entity_id"],
    sample_count: 8
  },
  
  // 🔄 SYNC & OFFLINE
  sync_queue: {
    description: "सिंक क्यू (Synchronization Queue)",
    fields: ["id", "operation", "table_name", "record_id", "data", "status", "timestamp"],
    indexes: ["status", "timestamp", "table_name"],
    sample_count: 0
  },
  
  offline_operations: {
    description: "ऑफलाइन ऑपरेशन्स (Offline Operations)",
    fields: ["id", "operation_type", "table_name", "data", "timestamp", "synced"],
    indexes: ["synced", "timestamp"],
    sample_count: 0
  }
};

// ===============================================
// 📁 FILE-BASED STORAGE (Page-Based Structure)
// ===============================================

export const PAGE_BASED_FILES = {
  base_path: "C:/malwa-crm/Data_base/",
  
  modules: {
    // 👥 Customer Module
    "Customer_Module": {
      path: "C:/malwa-crm/Data_base/Customer_Module/",
      files: [
        "meta.json",
        "customer.json",                    // Main customer data
        "customer-contacts.json",           // Customer contacts
        "customer-ledger.json",             // Customer ledger
        "customer-jobs.json",               // Customer job history
        "customer-documents.json",          // Customer documents
        "customer-service-history.json"     // Service history
      ]
    },
    
    // 🚗 Jobs Module
    "Jobs_Module": {
      path: "C:/malwa-crm/Data_base/Jobs_Module/",
      files: [
        "meta.json",
        "jobs.json",                        // Main jobs data
        "estimates.json",                   // Job estimates
        "jobsheets.json",                   // Work sheets
        "inspections.json",                 // Vehicle inspections
        "job-reports.json",                 // Job completion reports
        "chalans.json",                     // Delivery chalans
        "invoices.json"                     // Job invoices
      ]
    },
    
    // 🏭 Inventory Module
    "Inventory_Module": {
      path: "C:/malwa-crm/Data_base/Inventory_Module/",
      files: [
        "meta.json",
        "inventory.json",                   // Main inventory data
        "stock-movements.json",             // Stock transactions
        "categories.json",                  // Item categories
        "suppliers.json",                   // Inventory suppliers
        "purchase-orders.json",             // Purchase orders
        "stock-adjustments.json"            // Stock adjustments
      ]
    },
    
    // 🔧 Labour Module
    "Labour_Module": {
      path: "C:/malwa-crm/Data_base/Labour_Module/",
      files: [
        "meta.json",
        "labour.json",                      // Main labour data
        "attendance.json",                  // Daily attendance
        "labour-ledger.json",               // Labour accounts
        "payroll.json",                     // Salary records
        "overtime.json",                    // Overtime records
        "leaves.json"                       // Leave records
      ]
    },
    
    // 🏪 Vendors Module
    "Vendors_Module": {
      path: "C:/malwa-crm/Data_base/Vendors_Module/",
      files: [
        "meta.json",
        "vendors.json",                     // Main vendor data
        "vendor-ledger.json",               // Vendor accounts
        "purchase-orders.json",             // Orders to vendors
        "vendor-payments.json",             // Payment records
        "vendor-contracts.json"             // Vendor contracts
      ]
    },
    
    // 🏢 Suppliers Module
    "Suppliers_Module": {
      path: "C:/malwa-crm/Data_base/Suppliers_Module/",
      files: [
        "meta.json",
        "suppliers.json",                   // Main supplier data
        "supplier-ledger.json",             // Supplier accounts
        "material-orders.json",             // Material orders
        "supplier-payments.json",           // Payment records
        "quality-reports.json"              // Quality assessments
      ]
    },
    
    // 💰 Accounts Module
    "Accounts_Module": {
      path: "C:/malwa-crm/Data_base/Accounts_Module/",
      files: [
        "meta.json",
        "accounts.json",                    // Chart of accounts
        "transactions.json",                // All transactions
        "journal-entries.json",             // Journal entries
        "ledger-balances.json",             // Account balances
        "cash-receipts.json",               // Cash receipts
        "cash-payments.json",               // Cash payments
        "bank-reconciliation.json",         // Bank reconciliation
        "tax-records.json"                  // GST and tax records
      ]
    },
    
    // 📊 Summary Module
    "Summary_Module": {
      path: "C:/malwa-crm/Data_base/Summary_Module/",
      files: [
        "meta.json",
        "summary.json",                     // Dashboard summary
        "daily-reports.json",               // Daily reports
        "monthly-reports.json",             // Monthly reports
        "analytics.json",                   // Business analytics
        "kpi-metrics.json"                  // Key performance indicators
      ]
    },
    
    // ⚙️ Settings Module
    "Settings_Module": {
      path: "C:/malwa-crm/Data_base/Settings_Module/",
      files: [
        "meta.json",
        "settings.json",                    // System settings
        "user-management.json",             // User accounts
        "company-profile.json",             // Company information
        "backup-settings.json",             // Backup configuration
        "security-settings.json"            // Security preferences
      ]
    }
  },
  
  // ☁️ Google Drive Sync Files
  "GoogleDrive_Sync": {
    path: "C:/malwa-crm/Data_base/GoogleDrive_Sync/",
    files: [
      "page_based_sync_metadata.json",     // Main sync configuration
      "user_sync_configs/",               // User-specific sync settings
      "sync_logs.json",                   // Synchronization logs
      "conflict_resolution.json",         // Conflict resolution rules
      "backup_manifest.json"             // Backup file manifest
    ]
  }
};

// ===============================================
// 📊 DATABASE STATISTICS
// ===============================================

export const DATABASE_STATS = {
  total_stores: Object.keys(DATABASE_STORES).length,
  total_sample_records: Object.values(DATABASE_STORES).reduce((sum, store) => sum + store.sample_count, 0),
  total_modules: Object.keys(PAGE_BASED_FILES.modules).length,
  total_files_per_module: Object.values(PAGE_BASED_FILES.modules).reduce((sum, module) => sum + module.files.length, 0),
  
  storage_locations: {
    indexeddb: "Browser IndexedDB (Main Database)",
    file_system: "C:/malwa-crm/Data_base/ (Page-based Files)",
    google_drive: "Cloud Storage (Prepared for Sync)"
  },
  
  data_organization: {
    primary: "IndexedDB Stores (Real-time Operations)",
    secondary: "File-based Modules (Backup & Sync)",
    tertiary: "Google Drive Metadata (Cloud Integration)"
  }
};

// ===============================================
// 🎯 QUICK ACCESS FUNCTIONS
// ===============================================

export const getStoreList = () => Object.keys(DATABASE_STORES);

export const getModuleFiles = (moduleName) => {
  const module = PAGE_BASED_FILES.modules[moduleName];
  return module ? module.files : [];
};

export const getTotalRecordCount = () => {
  return Object.values(DATABASE_STORES).reduce((sum, store) => sum + store.sample_count, 0);
};

export const getStoresByCategory = () => {
  const categories = {};
  Object.entries(DATABASE_STORES).forEach(([name, config]) => {
    const category = config.description.split('(')[1]?.replace(')', '') || 'Other';
    if (!categories[category]) categories[category] = [];
    categories[category].push(name);
  });
  return categories;
};

// ===============================================
// 📋 USAGE EXAMPLE
// ===============================================

/*
// Get all store names
const stores = getStoreList();
console.log('Available Stores:', stores);

// Get files for specific module
const customerFiles = getModuleFiles('Customer_Module');
console.log('Customer Module Files:', customerFiles);

// Get total demo records
const totalRecords = getTotalRecordCount();
console.log('Total Demo Records:', totalRecords);

// Get stores by category
const categories = getStoresByCategory();
console.log('Stores by Category:', categories);
*/

export default {
  DATABASE_STORES,
  PAGE_BASED_FILES,
  DATABASE_STATS,
  getStoreList,
  getModuleFiles,
  getTotalRecordCount,
  getStoresByCategory
};