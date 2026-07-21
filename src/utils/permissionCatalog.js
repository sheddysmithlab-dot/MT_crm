// Permission Catalog - Defines all available permissions in the system
export const PERMISSION_CATALOG = {
  // Dashboard Permissions
  DASHBOARD_VIEW: { code: 'DASHBOARD_VIEW', label: 'View Dashboard', module: 'Dashboard' },
  
  // Jobs Module Permissions
  JOBS_VIEW: { code: 'JOBS_VIEW', label: 'View Jobs', module: 'Jobs' },
  JOBS_CREATE: { code: 'JOBS_CREATE', label: 'Create Jobs', module: 'Jobs' },
  JOBS_EDIT: { code: 'JOBS_EDIT', label: 'Edit Jobs', module: 'Jobs' },
  JOBS_DELETE: { code: 'JOBS_DELETE', label: 'Delete Jobs', module: 'Jobs' },
  JOBS_APPROVE: { code: 'JOBS_APPROVE', label: 'Approve Jobs', module: 'Jobs' },
  JOBS_EXPORT: { code: 'JOBS_EXPORT', label: 'Export Jobs', module: 'Jobs' },
  
  // Inspection Permissions
  INSPECTION_VIEW: { code: 'INSPECTION_VIEW', label: 'View Inspections', module: 'Jobs' },
  INSPECTION_CREATE: { code: 'INSPECTION_CREATE', label: 'Create Inspections', module: 'Jobs' },
  INSPECTION_EDIT: { code: 'INSPECTION_EDIT', label: 'Edit Inspections', module: 'Jobs' },
  INSPECTION_DELETE: { code: 'INSPECTION_DELETE', label: 'Delete Inspections', module: 'Jobs' },
  
  // Estimate Permissions
  ESTIMATE_VIEW: { code: 'ESTIMATE_VIEW', label: 'View Estimates', module: 'Jobs' },
  ESTIMATE_CREATE: { code: 'ESTIMATE_CREATE', label: 'Create Estimates', module: 'Jobs' },
  ESTIMATE_EDIT: { code: 'ESTIMATE_EDIT', label: 'Edit Estimates', module: 'Jobs' },
  ESTIMATE_DELETE: { code: 'ESTIMATE_DELETE', label: 'Delete Estimates', module: 'Jobs' },
  ESTIMATE_APPROVE: { code: 'ESTIMATE_APPROVE', label: 'Approve Estimates', module: 'Jobs' },
  
  // Jobsheet Permissions
  JOBSHEET_VIEW: { code: 'JOBSHEET_VIEW', label: 'View Jobsheets', module: 'Jobs' },
  JOBSHEET_CREATE: { code: 'JOBSHEET_CREATE', label: 'Create Jobsheets', module: 'Jobs' },
  JOBSHEET_EDIT: { code: 'JOBSHEET_EDIT', label: 'Edit Jobsheets', module: 'Jobs' },
  JOBSHEET_DELETE: { code: 'JOBSHEET_DELETE', label: 'Delete Jobsheets', module: 'Jobs' },
  
  // Challan Permissions
  CHALLAN_VIEW: { code: 'CHALLAN_VIEW', label: 'View Challans', module: 'Jobs' },
  CHALLAN_CREATE: { code: 'CHALLAN_CREATE', label: 'Create Challans', module: 'Jobs' },
  CHALLAN_EDIT: { code: 'CHALLAN_EDIT', label: 'Edit Challans', module: 'Jobs' },
  CHALLAN_DELETE: { code: 'CHALLAN_DELETE', label: 'Delete Challans', module: 'Jobs' },
  CHALLAN_POST: { code: 'CHALLAN_POST', label: 'Post Challans', module: 'Jobs' },
  
  // Invoice Permissions
  INVOICE_VIEW: { code: 'INVOICE_VIEW', label: 'View Invoices', module: 'Jobs' },
  INVOICE_CREATE: { code: 'INVOICE_CREATE', label: 'Create Invoices', module: 'Jobs' },
  INVOICE_EDIT: { code: 'INVOICE_EDIT', label: 'Edit Invoices', module: 'Jobs' },
  INVOICE_DELETE: { code: 'INVOICE_DELETE', label: 'Delete Invoices', module: 'Jobs' },
  INVOICE_POST: { code: 'INVOICE_POST', label: 'Post Invoices', module: 'Jobs' },
  INVOICE_EXPORT: { code: 'INVOICE_EXPORT', label: 'Export Invoices', module: 'Jobs' },
  
  // Operation & Management Permissions
  OM_VIEW: { code: 'OM_VIEW', label: 'View Operations & Management', module: 'O&M' },
  OM_CREATE: { code: 'OM_CREATE', label: 'Create Operations', module: 'O&M' },
  OM_EDIT: { code: 'OM_EDIT', label: 'Edit Operations', module: 'O&M' },
  OM_DELETE: { code: 'OM_DELETE', label: 'Delete Operations', module: 'O&M' },
  
  // Customer Module Permissions
  CUSTOMER_VIEW: { code: 'CUSTOMER_VIEW', label: 'View Customers', module: 'Customer' },
  CUSTOMER_CREATE: { code: 'CUSTOMER_CREATE', label: 'Create Customers', module: 'Customer' },
  CUSTOMER_EDIT: { code: 'CUSTOMER_EDIT', label: 'Edit Customers', module: 'Customer' },
  CUSTOMER_DELETE: { code: 'CUSTOMER_DELETE', label: 'Delete Customers', module: 'Customer' },
  CUSTOMER_EXPORT: { code: 'CUSTOMER_EXPORT', label: 'Export Customers', module: 'Customer' },
  
  // Customer Ledger Permissions
  CUSTOMER_LEDGER_VIEW: { code: 'CUSTOMER_LEDGER_VIEW', label: 'View Customer Ledger', module: 'Customer' },
  CUSTOMER_LEDGER_EDIT: { code: 'CUSTOMER_LEDGER_EDIT', label: 'Edit Customer Ledger', module: 'Customer' },
  CUSTOMER_LEDGER_EXPORT: { code: 'CUSTOMER_LEDGER_EXPORT', label: 'Export Customer Ledger', module: 'Customer' },
  
  // Vendor Module Permissions
  VENDOR_VIEW: { code: 'VENDOR_VIEW', label: 'View Vendors', module: 'Vendors' },
  VENDOR_CREATE: { code: 'VENDOR_CREATE', label: 'Create Vendors', module: 'Vendors' },
  VENDOR_EDIT: { code: 'VENDOR_EDIT', label: 'Edit Vendors', module: 'Vendors' },
  VENDOR_DELETE: { code: 'VENDOR_DELETE', label: 'Delete Vendors', module: 'Vendors' },
  VENDOR_LEDGER_VIEW: { code: 'VENDOR_LEDGER_VIEW', label: 'View Vendor Ledger', module: 'Vendors' },
  VENDOR_LEDGER_EDIT: { code: 'VENDOR_LEDGER_EDIT', label: 'Edit Vendor Ledger', module: 'Vendors' },
  VENDOR_EXPORT: { code: 'VENDOR_EXPORT', label: 'Export Vendors', module: 'Vendors' },
  
  // Employee Module Permissions
  LABOUR_VIEW: { code: 'LABOUR_VIEW', label: 'View Employee', module: 'Employee' },
  LABOUR_CREATE: { code: 'LABOUR_CREATE', label: 'Create Employee', module: 'Employee' },
  LABOUR_EDIT: { code: 'LABOUR_EDIT', label: 'Edit Employee', module: 'Employee' },
  LABOUR_DELETE: { code: 'LABOUR_DELETE', label: 'Delete Employee', module: 'Employee' },
  LABOUR_LEDGER_VIEW: { code: 'LABOUR_LEDGER_VIEW', label: 'View Employee Ledger', module: 'Employee' },
  LABOUR_LEDGER_EDIT: { code: 'LABOUR_LEDGER_EDIT', label: 'Edit Employee Ledger', module: 'Employee' },
  LABOUR_ATTENDANCE: { code: 'LABOUR_ATTENDANCE', label: 'Manage Attendance', module: 'Employee' },
  LABOUR_EXPORT: { code: 'LABOUR_EXPORT', label: 'Export Employee', module: 'Employee' },
  
  // Supplier Module Permissions
  SUPPLIER_VIEW: { code: 'SUPPLIER_VIEW', label: 'View Suppliers', module: 'Supplier' },
  SUPPLIER_CREATE: { code: 'SUPPLIER_CREATE', label: 'Create Suppliers', module: 'Supplier' },
  SUPPLIER_EDIT: { code: 'SUPPLIER_EDIT', label: 'Edit Suppliers', module: 'Supplier' },
  SUPPLIER_DELETE: { code: 'SUPPLIER_DELETE', label: 'Delete Suppliers', module: 'Supplier' },
  SUPPLIER_LEDGER_VIEW: { code: 'SUPPLIER_LEDGER_VIEW', label: 'View Supplier Ledger', module: 'Supplier' },
  SUPPLIER_LEDGER_EDIT: { code: 'SUPPLIER_LEDGER_EDIT', label: 'Edit Supplier Ledger', module: 'Supplier' },
  SUPPLIER_EXPORT: { code: 'SUPPLIER_EXPORT', label: 'Export Suppliers', module: 'Supplier' },
  
  // Inventory Module Permissions
  INVENTORY_VIEW: { code: 'INVENTORY_VIEW', label: 'View Inventory', module: 'Inventory' },
  INVENTORY_CREATE: { code: 'INVENTORY_CREATE', label: 'Create Inventory Items', module: 'Inventory' },
  INVENTORY_EDIT: { code: 'INVENTORY_EDIT', label: 'Edit Inventory Items', module: 'Inventory' },
  INVENTORY_DELETE: { code: 'INVENTORY_DELETE', label: 'Delete Inventory Items', module: 'Inventory' },
  INVENTORY_ADJUST: { code: 'INVENTORY_ADJUST', label: 'Adjust Inventory', module: 'Inventory' },
  INVENTORY_CATEGORY: { code: 'INVENTORY_CATEGORY', label: 'Manage Categories', module: 'Inventory' },
  INVENTORY_EXPORT: { code: 'INVENTORY_EXPORT', label: 'Export Inventory', module: 'Inventory' },
  
  // Accounts Module Permissions
  ACCOUNTS_VIEW: { code: 'ACCOUNTS_VIEW', label: 'View Accounts', module: 'Accounts' },
  ACCOUNTS_CREATE: { code: 'ACCOUNTS_CREATE', label: 'Create Accounts', module: 'Accounts' },
  ACCOUNTS_EDIT: { code: 'ACCOUNTS_EDIT', label: 'Edit Accounts', module: 'Accounts' },
  ACCOUNTS_DELETE: { code: 'ACCOUNTS_DELETE', label: 'Delete Accounts', module: 'Accounts' },
  
  // Purchase Permissions
  PURCHASE_VIEW: { code: 'PURCHASE_VIEW', label: 'View Purchases', module: 'Accounts' },
  PURCHASE_CREATE: { code: 'PURCHASE_CREATE', label: 'Create Purchases', module: 'Accounts' },
  PURCHASE_EDIT: { code: 'PURCHASE_EDIT', label: 'Edit Purchases', module: 'Accounts' },
  PURCHASE_DELETE: { code: 'PURCHASE_DELETE', label: 'Delete Purchases', module: 'Accounts' },
  PURCHASE_POST: { code: 'PURCHASE_POST', label: 'Post Purchases', module: 'Accounts' },
  
  // Voucher Permissions
  VOUCHER_VIEW: { code: 'VOUCHER_VIEW', label: 'View Vouchers', module: 'Accounts' },
  VOUCHER_CREATE: { code: 'VOUCHER_CREATE', label: 'Create Vouchers', module: 'Accounts' },
  VOUCHER_EDIT: { code: 'VOUCHER_EDIT', label: 'Edit Vouchers', module: 'Accounts' },
  VOUCHER_DELETE: { code: 'VOUCHER_DELETE', label: 'Delete Vouchers', module: 'Accounts' },
  VOUCHER_POST: { code: 'VOUCHER_POST', label: 'Post Vouchers', module: 'Accounts' },
  VOUCHER_APPROVE: { code: 'VOUCHER_APPROVE', label: 'Approve Vouchers', module: 'Accounts' },
  
  // GST Ledger Permissions
  GST_VIEW: { code: 'GST_VIEW', label: 'View GST Ledger', module: 'Accounts' },
  GST_EDIT: { code: 'GST_EDIT', label: 'Edit GST Ledger', module: 'Accounts' },
  GST_EXPORT: { code: 'GST_EXPORT', label: 'Export GST Reports', module: 'Accounts' },
  
  // Payment Permissions
  PAYMENT_VIEW: { code: 'PAYMENT_VIEW', label: 'View Payments', module: 'Accounts' },
  PAYMENT_CREATE: { code: 'PAYMENT_CREATE', label: 'Create Payments', module: 'Accounts' },
  PAYMENT_EDIT: { code: 'PAYMENT_EDIT', label: 'Edit Payments', module: 'Accounts' },
  PAYMENT_DELETE: { code: 'PAYMENT_DELETE', label: 'Delete Payments', module: 'Accounts' },
  PAYMENT_APPROVE: { code: 'PAYMENT_APPROVE', label: 'Approve Payments', module: 'Accounts' },
  
  // Summary Module Permissions
  SUMMARY_VIEW: { code: 'SUMMARY_VIEW', label: 'View Summary Reports', module: 'Summary' },
  SUMMARY_EXPORT: { code: 'SUMMARY_EXPORT', label: 'Export Summary Reports', module: 'Summary' },
  SUMMARY_INCENTIVE: { code: 'SUMMARY_INCENTIVE', label: 'View Incentive Reports', module: 'Summary' },
  
  // Daily Tasks Permissions
  DAILY_TASKS_VIEW: { code: 'DAILY_TASKS_VIEW', label: 'View Daily Tasks', module: 'Daily Tasks' },
  DAILY_TASKS_CREATE: { code: 'DAILY_TASKS_CREATE', label: 'Create Daily Tasks', module: 'Daily Tasks' },
  DAILY_TASKS_EDIT: { code: 'DAILY_TASKS_EDIT', label: 'Edit Daily Tasks', module: 'Daily Tasks' },
  DAILY_TASKS_DELETE: { code: 'DAILY_TASKS_DELETE', label: 'Delete Daily Tasks', module: 'Daily Tasks' },
  
  // Settings Module Permissions
  SETTINGS_VIEW: { code: 'SETTINGS_VIEW', label: 'View Settings', module: 'Settings' },
  SETTINGS_GENERAL: { code: 'SETTINGS_GENERAL', label: 'Manage General Settings', module: 'Settings' },
  SETTINGS_COMPANY: { code: 'SETTINGS_COMPANY', label: 'Manage Company Settings', module: 'Settings' },
  SETTINGS_USERS: { code: 'SETTINGS_USERS', label: 'Manage Users', module: 'Settings' },
  SETTINGS_PERMISSIONS: { code: 'SETTINGS_PERMISSIONS', label: 'Manage Permissions', module: 'Settings' },
  SETTINGS_BACKUP: { code: 'SETTINGS_BACKUP', label: 'Backup & Restore', module: 'Settings' },
  SETTINGS_SECURITY: { code: 'SETTINGS_SECURITY', label: 'Security Settings', module: 'Settings' },
  
  // Audit & Logs
  AUDIT_VIEW: { code: 'AUDIT_VIEW', label: 'View Audit Logs', module: 'Settings' },
  AUDIT_EXPORT: { code: 'AUDIT_EXPORT', label: 'Export Audit Logs', module: 'Settings' },
};

// Page Catalog - Maps routes to required permissions
export const PAGE_CATALOG = [
  { path: '/dashboard', label: 'Dashboard', module: 'Dashboard', requiredPermission: 'DASHBOARD_VIEW' },
  { path: '/jobs', label: 'Jobs', module: 'Jobs', requiredPermission: 'JOBS_VIEW' },
  { path: '/om', label: 'O & M', module: 'O&M', requiredPermission: 'OM_VIEW' },
  { path: '/customer', label: 'Customer', module: 'Customer', requiredPermission: 'CUSTOMER_VIEW' },
  { path: '/vendors', label: 'Vendors', module: 'Vendors', requiredPermission: 'VENDOR_VIEW' },
  { path: '/labour', label: 'Employee', module: 'Employee', requiredPermission: 'LABOUR_VIEW' },
  { path: '/supplier', label: 'Supplier', module: 'Supplier', requiredPermission: 'SUPPLIER_VIEW' },
  { path: '/inventory', label: 'Inventory', module: 'Inventory', requiredPermission: 'INVENTORY_VIEW' },
  { path: '/accounts', label: 'Accounts', module: 'Accounts', requiredPermission: 'ACCOUNTS_VIEW' },
  { path: '/summary', label: 'Summary', module: 'Summary', requiredPermission: 'SUMMARY_VIEW' },
  { path: '/daily-tasks', label: 'Daily Tasks', module: 'Daily Tasks', requiredPermission: 'DAILY_TASKS_VIEW' },
  { path: '/settings', label: 'Settings', module: 'Settings', requiredPermission: 'SETTINGS_VIEW' },
];

// Role Presets - Default permission sets for common roles
export const ROLE_PRESETS = {
  'Super Admin': {
    label: 'Super Admin',
    description: 'Full access to all features and settings',
    permissions: Object.keys(PERMISSION_CATALOG),
  },
  'Admin': {
    label: 'Admin',
    description: 'Access to most features except critical settings',
    permissions: Object.keys(PERMISSION_CATALOG).filter(p => 
      !p.includes('SETTINGS_PERMISSIONS') && 
      !p.includes('SETTINGS_SECURITY') &&
      !p.includes('AUDIT')
    ),
  },
  'Manager': {
    label: 'Manager',
    description: 'Can view and manage operational data',
    permissions: [
      'DASHBOARD_VIEW',
      'JOBS_VIEW', 'JOBS_CREATE', 'JOBS_EDIT', 'JOBS_APPROVE',
      'INSPECTION_VIEW', 'INSPECTION_CREATE', 'INSPECTION_EDIT',
      'ESTIMATE_VIEW', 'ESTIMATE_CREATE', 'ESTIMATE_EDIT', 'ESTIMATE_APPROVE',
      'JOBSHEET_VIEW', 'JOBSHEET_CREATE', 'JOBSHEET_EDIT',
      'CHALLAN_VIEW', 'CHALLAN_CREATE', 'CHALLAN_EDIT', 'CHALLAN_POST',
      'INVOICE_VIEW', 'INVOICE_CREATE', 'INVOICE_EDIT', 'INVOICE_POST',
      'CUSTOMER_VIEW', 'CUSTOMER_CREATE', 'CUSTOMER_EDIT', 'CUSTOMER_LEDGER_VIEW',
      'VENDOR_VIEW', 'VENDOR_CREATE', 'VENDOR_EDIT', 'VENDOR_LEDGER_VIEW',
      'LABOUR_VIEW', 'LABOUR_CREATE', 'LABOUR_EDIT', 'LABOUR_LEDGER_VIEW', 'LABOUR_ATTENDANCE',
      'SUPPLIER_VIEW', 'SUPPLIER_CREATE', 'SUPPLIER_EDIT', 'SUPPLIER_LEDGER_VIEW',
      'INVENTORY_VIEW', 'INVENTORY_CREATE', 'INVENTORY_EDIT', 'INVENTORY_ADJUST',
      'ACCOUNTS_VIEW', 'PURCHASE_VIEW', 'VOUCHER_VIEW', 'GST_VIEW', 'PAYMENT_VIEW',
      'SUMMARY_VIEW', 'SUMMARY_INCENTIVE',
      'DAILY_TASKS_VIEW', 'DAILY_TASKS_CREATE', 'DAILY_TASKS_EDIT',
      'SETTINGS_VIEW', 'SETTINGS_GENERAL',
    ],
  },
  'Accountant': {
    label: 'Accountant',
    description: 'Financial and accounting operations',
    permissions: [
      'DASHBOARD_VIEW',
      'CUSTOMER_VIEW', 'CUSTOMER_LEDGER_VIEW', 'CUSTOMER_LEDGER_EDIT', 'CUSTOMER_LEDGER_EXPORT',
      'VENDOR_VIEW', 'VENDOR_LEDGER_VIEW', 'VENDOR_LEDGER_EDIT',
      'LABOUR_VIEW', 'LABOUR_LEDGER_VIEW', 'LABOUR_LEDGER_EDIT',
      'SUPPLIER_VIEW', 'SUPPLIER_LEDGER_VIEW', 'SUPPLIER_LEDGER_EDIT',
      'ACCOUNTS_VIEW', 'ACCOUNTS_CREATE', 'ACCOUNTS_EDIT',
      'PURCHASE_VIEW', 'PURCHASE_CREATE', 'PURCHASE_EDIT', 'PURCHASE_POST',
      'VOUCHER_VIEW', 'VOUCHER_CREATE', 'VOUCHER_EDIT', 'VOUCHER_POST',
      'GST_VIEW', 'GST_EDIT', 'GST_EXPORT',
      'PAYMENT_VIEW', 'PAYMENT_CREATE', 'PAYMENT_EDIT',
      'INVOICE_VIEW', 'INVOICE_EXPORT',
      'SUMMARY_VIEW', 'SUMMARY_EXPORT',
      'SETTINGS_VIEW',
    ],
  },
  'Employee': {
    label: 'Employee',
    description: 'Basic operational access',
    permissions: [
      'DASHBOARD_VIEW',
      'JOBS_VIEW', 'JOBS_CREATE',
      'INSPECTION_VIEW', 'INSPECTION_CREATE',
      'ESTIMATE_VIEW', 'ESTIMATE_CREATE',
      'JOBSHEET_VIEW', 'JOBSHEET_CREATE',
      'CUSTOMER_VIEW',
      'INVENTORY_VIEW',
      'DAILY_TASKS_VIEW', 'DAILY_TASKS_CREATE',
    ],
  },
  'Read Only': {
    label: 'Read Only',
    description: 'View-only access to most modules',
    permissions: [
      'DASHBOARD_VIEW',
      'JOBS_VIEW',
      'INSPECTION_VIEW',
      'ESTIMATE_VIEW',
      'JOBSHEET_VIEW',
      'CHALLAN_VIEW',
      'INVOICE_VIEW',
      'CUSTOMER_VIEW',
      'CUSTOMER_LEDGER_VIEW',
      'VENDOR_VIEW',
      'VENDOR_LEDGER_VIEW',
      'LABOUR_VIEW',
      'LABOUR_LEDGER_VIEW',
      'SUPPLIER_VIEW',
      'SUPPLIER_LEDGER_VIEW',
      'INVENTORY_VIEW',
      'ACCOUNTS_VIEW',
      'PURCHASE_VIEW',
      'VOUCHER_VIEW',
      'GST_VIEW',
      'PAYMENT_VIEW',
      'SUMMARY_VIEW',
      'DAILY_TASKS_VIEW',
    ],
  },
};

// Group permissions by module for better organization
export const getPermissionsByModule = () => {
  const modules = {};
  Object.values(PERMISSION_CATALOG).forEach(permission => {
    if (!modules[permission.module]) {
      modules[permission.module] = [];
    }
    modules[permission.module].push(permission);
  });
  return modules;
};

// Get permission actions for a module
export const getPermissionActions = (moduleName) => {
  const permissions = Object.values(PERMISSION_CATALOG).filter(
    p => p.module === moduleName
  );
  
  const actions = new Set();
  permissions.forEach(p => {
    const action = p.code.split('_').pop();
    actions.add(action);
  });
  
  return Array.from(actions);
};
