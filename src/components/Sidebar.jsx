import { useState, useEffect, useMemo } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, ChevronDown, LogOut, Settings, Truck, Users, Building, HardHat, Package, Warehouse, Landmark, BarChart, ClipboardList, Wrench } from 'lucide-react';
import { useAuthStore } from '@/store/authManagementStore';
import { usePermissionStore } from '@/store/authManagementStore';
import { useUiStore } from '@/store/appStateStore';
import useCompanyStore from '@/store/companyStore';
import { usePageAccess } from '@/hooks/usePageAccess';
import { AnimatePresence, motion } from 'framer-motion';
import ConfirmModal from './ui/ConfirmModal';

const sidebarNavItems = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard, permission: 'DASHBOARD_VIEW', pageKey: 'dashboard' },
  { title: "Jobs", href: "/jobs", icon: Truck, permission: 'JOBS_VIEW', pageKey: 'jobs', children: [
      { title: "Vehicle Inspection", href: "/jobs?step=inspection", subPageKey: 'inspectionStep' }, 
      { title: "Estimate", href: "/jobs?step=estimate", subPageKey: 'estimateStep' },
      { title: "Job Sheet", href: "/jobs?step=jobsheet", subPageKey: 'jobSheetStep' }, 
      { title: "Labour Bill", href: "/jobs?step=chalan", subPageKey: 'chalanStep' },
      { title: "Invoice", href: "/jobs?step=invoice", subPageKey: 'invoiceStep' },
  ]},
  { title: "O&M", href: "/om", icon: Wrench, permission: 'OM_VIEW', pageKey: 'om' },
  { title: "Customer", href: "/customer", icon: Users, permission: 'CUSTOMER_VIEW', pageKey: 'customer', children: [
      { title: "Customer Details", href: "/customer?tab=details", subPageKey: 'customerDetailsTab' }, 
      { title: "Customer Ledger", href: "/customer?tab=ledger", subPageKey: 'customerLedgerTab' },
      { title: "Leads", href: "/customer?tab=leads", subPageKey: 'leadsTab' },
  ]},
  { title: "Vendors", href: "/vendors", icon: Building, permission: 'VENDOR_VIEW', pageKey: 'vendors', children: [
      { title: "Vendor Details", href: "/vendors?tab=details", subPageKey: 'vendorDetailsTab' },
      { title: "Vendor Ledger", href: "/vendors?tab=ledger", subPageKey: 'vendorLedgerTab' },
  ]},
  { title: "Employee", href: "/labour", icon: HardHat, permission: 'LABOUR_VIEW', pageKey: 'labour', children: [
      { title: "Employee Details", href: "/labour?tab=details", subPageKey: 'labourDetailsTab' },
      { title: "Employee Ledger", href: "/labour?tab=ledger", subPageKey: 'labourLedgerTab' },
  ]},
  { title: "Supplier", href: "/supplier", icon: Package, permission: 'SUPPLIER_VIEW', pageKey: 'supplier', children: [
      { title: "Supplier Details", href: "/supplier?tab=details", subPageKey: 'supplierDetailsTab' }, 
      { title: "Supplier Ledger", href: "/supplier?tab=ledger", subPageKey: 'supplierLedgerTab' },
  ]},
  { title: "Inventory", href: "/inventory", icon: Warehouse, permission: 'INVENTORY_VIEW', pageKey: 'inventory', children: [
      { title: "Stock Management", href: "/inventory?tab=stock", subPageKey: 'stockTab' }, 
      { title: "Category Manager", href: "/inventory?tab=categories", subPageKey: 'categoryManager' },
      { title: "Stock", href: "/inventory?tab=movements", subPageKey: 'stockMovements' },
  ]},
  { title: "Accounts", href: "/accounts", icon: Landmark, permission: 'ACCOUNTS_VIEW', pageKey: 'accounts', children: [
      { title: "Purchase", href: "/accounts?tab=purchase", subPageKey: 'purchase' }, 
      { title: "Voucher", href: "/accounts?tab=voucher", subPageKey: 'voucher' },
      { title: "Other Expenses", href: "/accounts?tab=expenses", subPageKey: 'otherExpenses' },
      { title: "Invoice", href: "/accounts?tab=invoice", subPageKey: 'invoice' },
      { title: "Challan", href: "/accounts?tab=challan", subPageKey: 'challan' },
      { title: "Sell Challan", href: "/accounts?tab=sell-challan", subPageKey: 'sellchallan' },
      { title: "Cash Receipt", href: "/accounts?tab=cash-receipt", subPageKey: 'cashReceipt' },
      { title: "GST Ledger", href: "/accounts?tab=GST", subPageKey: 'gstledger' },
  ]},
  { title: "Summary", href: "/summary", icon: BarChart, permission: 'SUMMARY_VIEW', pageKey: 'summary' },
  { title: "Daily Tasks", href: "/daily-tasks", icon: ClipboardList, permission: 'DAILY_TASKS_VIEW', pageKey: 'dailyTasks' },
];

const SidebarContent = ({ onLinkClick }) => {
  const { user, logout, profile } = useAuthStore();
  const { can } = usePermissionStore();
  const { hasAccess, loading: pageAccessLoading } = usePageAccess();
  const { companyDetails } = useCompanyStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [openSections, setOpenSections] = useState({});
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  // Memoize filtered menu items to prevent infinite re-renders
  const allowedNavItems = useMemo(() => {
    // If still loading, return empty array to show loading state
    if (pageAccessLoading) {
      return [];
    }

    try {
      return sidebarNavItems.filter(item => {
        // Check permission first
        if (item.permission && !can(item.permission)) return false;
        
        // Check page visibility from user_page_visibility
        if (item.pageKey) {
          const hasPageAccess = hasAccess(item.pageKey);
          if (!hasPageAccess) {
            console.log(`🚫 Access denied to: ${item.pageKey}`);
            return false;
          }
          console.log(`✅ Access granted to: ${item.pageKey}`);
        }
        
        return true;
      }).map(item => {
        // Create a shallow copy to avoid mutation
        const filteredItem = { ...item };
        
        // Filter children based on subpage visibility
        if (item.children && item.pageKey && item.children.length > 0) {
          const visibleChildren = item.children.filter(child => {
            if (child.subPageKey) {
              try {
                const hasSubPageAccess = hasAccess(item.pageKey, child.subPageKey);
                if (!hasSubPageAccess) {
                  console.log(`🚫 Access denied to subpage: ${item.pageKey}/${child.subPageKey}`);
                  return false;
                }
                console.log(`✅ Access granted to subpage: ${item.pageKey}/${child.subPageKey}`);
                return true;
              } catch (error) {
                console.warn('Error checking subpage access:', error);
                return true; // Default to visible if error
              }
            }
            return true;
          });
          
          filteredItem.children = visibleChildren;
        }
        
        return filteredItem;
      });
    } catch (error) {
      console.warn('Error filtering navigation items:', error);
      // Fallback to permission-only filtering
      return sidebarNavItems.filter(item => !item.permission || can(item.permission));
    }
  }, [can, pageAccessLoading, hasAccess]); // Added hasAccess back to dependencies

  // Memoize the active parent calculation to prevent unnecessary re-renders
  const activeParent = useMemo(() => {
    return allowedNavItems.find(item => location.pathname.startsWith(item.href));
  }, [location.pathname, allowedNavItems]);

  useEffect(() => {
    if (activeParent && !openSections[activeParent.title]) {
      setOpenSections(prev => ({ ...prev, [activeParent.title]: true }));
    }
  }, [activeParent, openSections]);

  const handleLogout = () => { logout(); navigate('/login'); };
  const toggleSection = (title) => setOpenSections(prev => ({ ...prev, [title]: !prev[title] }));
  const handleNavigate = (href) => {
    navigate(href);
    if(onLinkClick) onLinkClick();
  }
  
  const isLinkActive = (item) => location.pathname.startsWith(item.href);

  return (
    <>
      <ConfirmModal isOpen={isLogoutModalOpen} onClose={() => setIsLogoutModalOpen(false)} onConfirm={handleLogout} title="Confirm Logout" message="Are you sure you want to log out?" />
      <div className="flex flex-col h-full bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900 text-white relative overflow-hidden">
        {/* Animated Shine Effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shine pointer-events-none"></div>
        <div className="p-4 shrink-0 relative z-10 flex justify-center">
          <div 
            className="bg-white rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.3)] p-3 transform hover:scale-105 hover:-translate-y-1 transition-all duration-300 cursor-pointer border-2 border-blue-200"
            onClick={() => navigate('/dashboard')}
          >
            <img 
              src={companyDetails.logo || "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEhUspgoCiiYzdVTGXzZ_eGuIJ4DFg467VMmQwkaQgCwek_y_BYYegfR67o1gk2bXxPaWd6VhJoR-7npqySIzyK8IV7EY67YDAgviRmXwOA5FzauC4kmjeqe4C-y9Du6u5aOsZiPvRBv0xnoKb6Pi5KGlDs3KxoeyMT5oQYY5ffMBD9s412M4KrDevShgOw/s320/logo.png"} 
              alt="Company Logo" 
              className="h-32 w-auto object-contain" 
            />
          </div>
        </div>
        
        <div className="p-4 border-b border-blue-800/50 shrink-0 relative z-10">
          <div 
            className="flex items-center cursor-pointer hover:bg-blue-800 rounded-lg p-2 transition-colors duration-200"
            onClick={() => {
              navigate('/settings?tab=myprofile');
              if (onLinkClick) onLinkClick();
            }}
            title="Click to edit profile"
          >
            {profile?.photo ? (
              <img
                src={profile.photo}
                alt="Profile"
                className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-md shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-brand-red flex items-center justify-center font-bold text-xl shrink-0">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'M'}
              </div>
            )}
            <div className="ml-3 truncate">
              <p className="font-semibold text-white truncate">{user?.name || 'Malwa User'}</p>
              {user?.id === 'super-admin-sheddy-001' || user?.email === 'Shahidmultaniii' ? (
                <p className="text-xs text-yellow-400 font-bold animate-pulse">👑 GOD MODE</p>
              ) : (
                <p className="text-xs text-blue-300 font-bold">{user?.role || 'Admin'}</p>
              )}
            </div>
          </div>
        </div>

        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto relative z-10">
          {allowedNavItems.map((item) => {
            const isActive = isLinkActive(item);
            return (
              <div key={item.title}>
                <div className={`flex items-center justify-between p-2 rounded-lg text-white hover:bg-blue-800 cursor-pointer transition-colors duration-200 ${isActive ? 'bg-brand-red font-semibold' : ''}`} onClick={() => item.children ? toggleSection(item.title) : handleNavigate(item.href)}>
                  <div className={`flex items-center relative`}>
                     {isActive && <div className="absolute -left-2 w-1 h-full bg-brand-gold rounded-r-full"></div>}
                    <item.icon className="h-6 w-6" />
                    <span className="ml-3 font-medium text-base">{item.title}</span>
                  </div>
                  {item.children && <ChevronDown className={`h-5 w-5 transition-transform duration-200 ${openSections[item.title] ? 'rotate-180' : ''}`} />}
                </div>
                <AnimatePresence>
                {openSections[item.title] && item.children && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18, ease: 'easeOut' }} className="overflow-hidden">
                    <div className="pl-6 pt-2 space-y-1">
                      {item.children.map((child) => (
                        <NavLink key={child.title} to={child.href} onClick={onLinkClick} className={({ isActive: isChildActive }) => `flex items-center p-2 text-base rounded-lg hover:bg-blue-800 transition-colors duration-200 relative ${ isChildActive ? 'bg-blue-900/50 text-white font-semibold' : 'text-blue-100' }`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current mr-4"></span>
                          {child.title}
                        </NavLink>
                      ))}
                    </div>
                  </motion.div>
                )}
                </AnimatePresence>
              </div>
          )})}
        </nav>

        <div className="p-4 border-t border-blue-800/50 space-y-2 shrink-0 relative z-10">
          <NavLink to="/settings" className="flex items-center justify-center w-full p-2 text-base font-medium text-white rounded-lg hover:bg-blue-800">
            <Settings className="h-6 w-6 mr-2" /> Settings
          </NavLink>
          <button onClick={() => setIsLogoutModalOpen(true)} className="flex items-center justify-center w-full p-2 text-base font-medium text-white bg-brand-red rounded-lg hover:bg-brand-red-dark">
            <LogOut className="h-6 w-6 mr-2" /> Logout
          </button>
        </div>
      </div>
    </>
  );
};

const Sidebar = () => {
    const { isSidebarOpen } = useUiStore();
    return (
        <aside className={`fixed top-0 left-0 h-full z-40 flex flex-col w-64 shrink-0 bg-gradient-to-b from-brand-blue to-blue-900 dark:from-blue-950 dark:to-blue-900 transition-transform duration-300 ease-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} shadow-2xl`}>
            <SidebarContent />
        </aside>
    );
};

export { SidebarContent };
export default Sidebar;
