/**
 * Comprehensive Role-Based Access Control (RBAC) Configuration
 * Defines all roles, their permissions, and page access rules
 */

// Role definitions with complete page access mappings
export const ROLE_DEFINITIONS = {
  'Super Admin': {
    label: 'Super Admin',
    description: 'God mode - Full unconditional access to everything',
    visible: true,
    usable: true,
    godMode: true, // Bypasses all permission checks
    pageAccess: {
      dashboard: true,
      jobs: {
        enabled: true,
        subPages: {
          inspectionStep: true,
          estimateStep: true,
          jobSheetStep: true,
          chalanStep: true,
          invoiceStep: true
        }
      },
      om: true,
      customer: {
        enabled: true,
        subPages: {
          customerDetailsTab: true,
          customerLedgerTab: true,
          leadsTab: true
        }
      },
      vendors: {
        enabled: true,
        subPages: {
          vendorDetailsTab: true,
          vendorLedgerTab: true
        }
      },
      labour: {
        enabled: true,
        subPages: {
          labourDetailsTab: true,
          labourLedgerTab: true
        }
      },
      supplier: {
        enabled: true,
        subPages: {
          supplierDetailsTab: true,
          supplierLedgerTab: true
        }
      },
      inventory: {
        enabled: true,
        subPages: {
          stockTab: true,
          categoryManager: true,
          stockMovements: true
        }
      },
      accounts: {
        enabled: true,
        subPages: {
          purchase: true,
          voucher: true,
          otherExpenses: true,
          invoice: true,
          challan: true,
          sellchallan: true,
          cashReceipt: true,
          gstledger: true
        }
      },
      summary: { enabled: true, subPages: {} },
      dailyTasks: true,
      settings: {
        enabled: true,
        subPages: {
          general: true,
          myProfile: true,
          companyMaster: true,
          rateListMemory: true,
          userManagement: true,
          security: true,
          about: true
        }
      }
    }
  },

  'Admin': {
    label: 'Admin',
    description: 'Admin with GST-only data visibility',
    visible: true,
    usable: true,
    gstOnlyMode: true, // Special flag for GST-filtered data
    defaultEmail: 'malwatrolley@gmail.com', // Auto-fill on login
    pageAccess: {
      dashboard: false, // No dashboard access
      jobs: {
        enabled: true,
        subPages: {
          inspectionStep: true,
          estimateStep: true,
          jobSheetStep: true,
          chalanStep: false, // Not in spec
          invoiceStep: true
        }
      },
      om: false,
      customer: {
        enabled: true,
        subPages: {
          customerDetailsTab: true,
          customerLedgerTab: true,
          leadsTab: false
        }
      },
      vendors: { enabled: false, subPages: {} }, // Not in spec
      labour: { 
        enabled: true, 
        subPages: { 
          labourDetailsTab: true, 
          labourLedgerTab: true 
        } 
      },
      supplier: { 
        enabled: true, 
        subPages: { 
          supplierDetailsTab: true, 
          supplierLedgerTab: true 
        } 
      },
      inventory: { enabled: false, subPages: {} }, // Not in spec
      accounts: { 
        enabled: true, 
        subPages: { 
          purchase: true, 
          voucher: false,
          otherExpenses: true, 
          invoice: true, 
          challan: false,
          sellchallan: false,
          cashReceipt: false,
          gstledger: false 
        } 
      },
      summary: { enabled: false, subPages: {} }, // Not in spec
      dailyTasks: false, // Not in spec
      settings: { 
        enabled: true, 
        subPages: { 
          general: true, 
          myProfile: true, 
          companyMaster: false,
          rateListMemory: false,
          userManagement: false,
          security: true, 
          about: true 
        } 
      }
    }
  },

  'Manager': {
    label: 'Manager',
    description: 'Operational management with full visibility',
    visible: true,
    usable: true,
    pageAccess: {
      dashboard: true,
      jobs: {
        enabled: true,
        subPages: {
          inspectionStep: true,
          estimateStep: true,
          jobSheetStep: true,
          chalanStep: true,
          invoiceStep: true
        }
      },
      om: true,
      customer: {
        enabled: true,
        subPages: {
          customerDetailsTab: true,
          customerLedgerTab: true,
          leadsTab: true
        }
      },
      vendors: {
        enabled: true,
        subPages: {
          vendorDetailsTab: true,
          vendorLedgerTab: true
        }
      },
      labour: {
        enabled: true,
        subPages: {
          labourDetailsTab: true,
          labourLedgerTab: true
        }
      },
      supplier: {
        enabled: true,
        subPages: {
          supplierDetailsTab: true,
          supplierLedgerTab: true
        }
      },
      inventory: {
        enabled: true,
        subPages: {
          stockTab: true,
          categoryManager: true,
          stockMovements: true
        }
      },
      accounts: {
        enabled: true,
        subPages: {
          purchase: true,
          voucher: true,
          otherExpenses: true,
          invoice: true,
          challan: true,
          sellchallan: true,
          cashReceipt: true,
          gstledger: true
        }
      },
      summary: { enabled: true, subPages: {} },
      dailyTasks: true,
      settings: {
        enabled: true,
        subPages: {
          general: true,
          myProfile: true,
          companyMaster: true,
          rateListMemory: true,
          userManagement: false,
          security: true,
          about: true
        }
      }
    }
  },

  'Accountant': {
    label: 'Accountant',
    description: 'Financial operations and reporting',
    visible: true,
    usable: true,
    pageAccess: {
      dashboard: true,
      jobs: {
        enabled: true,
        subPages: {
          inspectionStep: true,
          estimateStep: true,
          jobSheetStep: true,
          chalanStep: true,
          invoiceStep: true
        }
      },
      om: false,
      customer: {
        enabled: true,
        subPages: {
          customerDetailsTab: true,
          customerLedgerTab: true,
          leadsTab: true
        }
      },
      vendors: {
        enabled: true,
        subPages: {
          vendorDetailsTab: true,
          vendorLedgerTab: true
        }
      },
      labour: {
        enabled: true,
        subPages: {
          labourDetailsTab: true,
          labourLedgerTab: true
        }
      },
      supplier: {
        enabled: true,
        subPages: {
          supplierDetailsTab: true,
          supplierLedgerTab: true
        }
      },
      inventory: {
        enabled: true,
        subPages: {
          stockTab: true,
          categoryManager: true,
          stockMovements: true
        }
      },
      accounts: {
        enabled: true,
        subPages: {
          purchase: true,
          voucher: true,
          otherExpenses: true,
          invoice: true,
          challan: true,
          sellchallan: true,
          cashReceipt: true,
          gstledger: true
        }
      },
      summary: { enabled: true, subPages: {} },
      dailyTasks: true,
      settings: {
        enabled: true,
        subPages: {
          general: true,
          myProfile: true,
          companyMaster: false,
          rateListMemory: true,
          userManagement: false,
          security: true,
          about: true
        }
      }
    }
  },

  'Employee': {
    label: 'Employee',
    description: 'Basic operational access',
    visible: true,
    usable: true,
    pageAccess: {
      dashboard: false, // Not in spec
      jobs: { enabled: false, subPages: {} }, // Not in spec
      om: false,
      customer: {
        enabled: true,
        subPages: {
          customerDetailsTab: true,
          customerLedgerTab: false, 
          leadsTab: false 
        } 
      },
      vendors: { enabled: false, subPages: {} },
      labour: { 
        enabled: true, 
        subPages: { 
          labourDetailsTab: true, 
          labourLedgerTab: true 
        } 
      },
      supplier: { 
        enabled: true, 
        subPages: { 
          supplierDetailsTab: false, 
          supplierLedgerTab: true 
        } 
      },
      inventory: { enabled: false, subPages: {} },
      accounts: { 
        enabled: true, 
        subPages: { 
          purchase: true, 
          voucher: true, 
          otherExpenses: true, 
          invoice: false,
          challan: true,
          sellchallan: false,
          cashReceipt: false,
          gstledger: false 
        } 
      },
      summary: { enabled: false, subPages: {} },
      dailyTasks: true,
      settings: { 
        enabled: true, 
        subPages: { 
          general: true, 
          myProfile: true, 
          companyMaster: false,
          rateListMemory: false,
          userManagement: false,
          security: true, 
          about: true 
        } 
      }
    }
  }
};

/**
 * Get role configuration by role name
 */
export const getRoleConfig = (roleName) => {
  return ROLE_DEFINITIONS[roleName] || null;
};

/**
 * Check if role has god mode (bypasses all checks)
 */
export const isGodMode = (roleName) => {
  const role = ROLE_DEFINITIONS[roleName];
  return role?.godMode === true;
};

/**
 * Check if role has GST-only mode
 */
export const isGstOnlyRole = (roleName) => {
  const role = ROLE_DEFINITIONS[roleName];
  return role?.gstOnlyMode === true;
};

/**
 * Get default email for role (used for auto-fill on login)
 */
export const getRoleDefaultEmail = (roleName) => {
  const role = ROLE_DEFINITIONS[roleName];
  return role?.defaultEmail || '';
};

/**
 * Get all available roles
 */
export const getAllRoles = () => {
  return Object.keys(ROLE_DEFINITIONS);
};

/**
 * Check if user has access to a page/subpage based on role
 */
export const hasRoleAccess = (roleName, pageKey, subPageKey = null) => {
  const role = ROLE_DEFINITIONS[roleName];
  
  if (!role) return false;
  if (role.godMode) return true; // God mode bypasses all checks
  
  const pageAccess = role.pageAccess[pageKey];
  
  // Simple boolean page
  if (typeof pageAccess === 'boolean') {
    return pageAccess;
  }
  
  // Page with subpages
  if (pageAccess && typeof pageAccess === 'object') {
    if (subPageKey) {
      return pageAccess.subPages?.[subPageKey] || false;
    }
    return pageAccess.enabled || false;
  }
  
  return false;
};

export default ROLE_DEFINITIONS;
