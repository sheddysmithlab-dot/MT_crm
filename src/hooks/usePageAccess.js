import { useState, useEffect } from 'react';
import { dbOperations } from '@/lib/db';
import { useAuthStore } from '@/store/authManagementStore';
import { hasRoleAccess, getRoleConfig, isGodMode } from '@/utils/roleDefinitions';

/**
 * Hook to check if user has access to specific pages based on role-based permissions
 */
export const usePageAccess = () => {
  const { user, profile } = useAuthStore();
  const [pageAccess, setPageAccess] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPageAccess = async () => {
      if (!user?.id) {
        console.log('⚠️ No user ID, skipping page access load');
        setLoading(false);
        return;
      }

      console.log('🔄 Loading page access for user:', user.id, 'role:', profile?.role);

      try {
        // Get user's role
        const userRole = profile?.role || user.role;
        
        // Check for god mode (Super Admin)
        if (isGodMode(userRole) || user.id === 'super-admin-sheddy-001' || user.email === 'Shahidmultaniii') {
          console.log('👑 God mode active - full access granted');
          const godModeAccess = {
            dashboard: true,
            jobs: { enabled: true, subPages: { inspectionStep: true, estimateStep: true, jobSheetStep: true, chalanStep: true, invoiceStep: true } },
            om: true,
            customer: { enabled: true, subPages: { customerDetailsTab: true, customerLedgerTab: true, leadsTab: true } },
            vendors: { enabled: true, subPages: { vendorDetailsTab: true, vendorLedgerTab: true } },
            labour: { enabled: true, subPages: { labourDetailsTab: true, labourLedgerTab: true } },
            supplier: { enabled: true, subPages: { supplierDetailsTab: true, supplierLedgerTab: true } },
            inventory: { enabled: true, subPages: { stockTab: true, categoryManager: true, stockMovements: true } },
            accounts: { enabled: true, subPages: { purchase: true, voucher: true, otherExpenses: true, invoice: true, challan: true, sellchallan: true, cashReceipt: true, gstledger: true } },
            summary: { enabled: true, subPages: {} },
            dailyTasks: true,
            settings: { enabled: true, subPages: { general: true, myProfile: true, companyMaster: true, rateListMemory: true, userManagement: true, security: true, about: true } }
          };
          setPageAccess(godModeAccess);
          setLoading(false);
          return;
        }

        // Get role configuration
        const roleConfig = getRoleConfig(userRole);
        
        if (roleConfig && roleConfig.pageAccess) {
          console.log('✅ Loaded page access from role configuration:', userRole);
          setPageAccess(roleConfig.pageAccess);
        } else {
          console.log('⚠️ No role configuration found, checking database...');
          
          // Fallback: Try to load from user_page_visibility store
          const allVisibilityRecords = await dbOperations.getAll('user_page_visibility');
          const userVisibility = allVisibilityRecords?.find(record => record.userId === user.id);

          if (userVisibility && userVisibility.pageAccess) {
            console.log('✅ Loaded page access from database');
            setPageAccess(userVisibility.pageAccess);
          } else {
            console.log('⚠️ No page access found, using minimal default');
            // Minimal default access
            setPageAccess({
              dashboard: true,
              jobs: { enabled: false, subPages: {} },
              om: false,
              customer: { enabled: false, subPages: {} },
              vendors: { enabled: false, subPages: {} },
              labour: { enabled: false, subPages: {} },
              supplier: { enabled: false, subPages: {} },
              inventory: { enabled: false, subPages: {} },
              accounts: { enabled: false, subPages: {} },
              summary: { enabled: false, subPages: {} },
              dailyTasks: false,
              settings: { enabled: true, subPages: { general: true, myProfile: true, security: true, about: true } }
            });
          }
        }
      } catch (error) {
        console.error('❌ Error loading page access:', error);
        // On error, provide minimal access
        setPageAccess({
          dashboard: true,
          jobs: { enabled: false, subPages: {} },
          om: false,
          customer: { enabled: false, subPages: {} },
          vendors: { enabled: false, subPages: {} },
          labour: { enabled: false, subPages: {} },
          supplier: { enabled: false, subPages: {} },
          inventory: { enabled: false, subPages: {} },
          accounts: { enabled: false, subPages: {} },
          summary: { enabled: false, subPages: {} },
          dailyTasks: false,
          settings: { enabled: true, subPages: { general: true, myProfile: true, security: true, about: true } }
        });
      } finally {
        console.log('✅ Page access loading complete');
        setLoading(false);
      }
    };

    loadPageAccess();
  }, [user?.id, profile?.role]);

  /**
   * Check if user has access to a specific page
   * @param {string} pageKey - The page key (e.g., 'dashboard', 'jobs', 'customer')
   * @param {string} subPageKey - Optional subpage key (e.g., 'vehicleInspection', 'leads')
   * @returns {boolean} - Whether user has access
   */
  const hasAccess = (pageKey, subPageKey = null) => {
    // Super Admin has god-mode access to everything - no database checks needed
    if (user?.id === 'super-admin-sheddy-001' || user?.email === 'Shahidmultaniii') {
      return true;
    }

    if (!pageAccess) return false;

    const page = pageAccess[pageKey];
    
    // Simple boolean page (like dashboard, summary, dailyTasks)
    if (typeof page === 'boolean') {
      return page;
    }
    
    // Page with subpages
    if (page && typeof page === 'object') {
      // If checking subpage access
      if (subPageKey) {
        return page.subPages?.[subPageKey] || false;
      }
      // If checking main page access
      return page.enabled || false;
    }
    
    return false;
  };

  /**
   * Get all accessible subpages for a module
   * @param {string} pageKey - The page key (e.g., 'jobs', 'customer')
   * @returns {object} - Object with subpage keys and their access status
   */
  const getSubPages = (pageKey) => {
    // Super Admin has god-mode access to all subpages
    if (user?.id === 'super-admin-sheddy-001' || user?.email === 'Shahidmultaniii') {
      // Return full access for all possible subpages
      return {
        inspectionStep: true,
        estimateStep: true,
        jobSheetStep: true,
        chalanStep: true,
        invoiceStep: true,
        customerDetailsTab: true,
        customerLedgerTab: true,
        leadsTab: true,
        vendorDetailsTab: true,
        vendorLedgerTab: true,
        labourDetailsTab: true,
        labourLedgerTab: true,
        labourLedgerView: true,
        supplierDetailsTab: true,
        supplierLedgerTab: true,
        stockTab: true,
        categoryManager: true,
        stockMovements: true,
        purchase: true,
        voucher: true,
        otherExpenses: true,
        invoice: true,
        challan: true,
        sellchallan: true,
        cashReceipt: true,
        gstledger: true,
        incentiveSummary: true,
        penaltyCard: true,
        summaryDashboard: true
      };
    }

    if (!pageAccess) return {};
    
    const page = pageAccess[pageKey];
    if (page && typeof page === 'object' && page.subPages) {
      return page.subPages;
    }
    
    return {};
  };

  return {
    pageAccess,
    hasAccess,
    getSubPages,
    loading
  };
};
