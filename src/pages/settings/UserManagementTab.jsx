import { Users, Shield, UserCircle, Clock, Database, UserPlus, X, Eye, EyeOff, CheckCircle, Edit, Trash2, Search, HardDrive } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import ManagePermissionsModal from './ManagePermissionsModal';
import SettlementAuditModal from './SettlementAuditModal';
import AdminPasswordModal from '@/components/AdminPasswordModal';
import { useAuthStore } from '@/store/authManagementStore';
import useSettingsStore from '@/store/settingsStore';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { dbOperations } from '@/lib/db';
import { broadcastDataChange } from '@/utils/dataSync';
import { getAllRoles, getRoleConfig } from '@/utils/roleDefinitions';

const UserManagementTab = () => {
  const { user, profile } = useAuthStore();
  const { saveUsers, loadUsers, saveRoles, loadRoles, saveUserPermissions, loadUserPermissions, createUserFile, saveUserPageAccess, loadAllUserPageAccess } = useSettingsStore();
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(true); // Password protection on load
  const [isAccessGranted, setIsAccessGranted] = useState(false); // Track if user has verified password
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isManageUsersModalOpen, setIsManageUsersModalOpen] = useState(false);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [isManagePermissionsModalOpen, setIsManagePermissionsModalOpen] = useState(false);
  const [isCacheManagerModalOpen, setIsCacheManagerModalOpen] = useState(false);
  const [isSettlementAuditOpen, setIsSettlementAuditOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);
  const [cacheStatus, setCacheStatus] = useState(null);

  // Load users and roles on component mount (only after password verification)
  useEffect(() => {
    if (isAccessGranted) {
      loadAllUsers();
      loadRolesAndPermissions();
      loadCacheStatus();
    }
  }, [isAccessGranted]);

  const loadCacheStatus = () => {
    if (window.cacheManager) {
      try {
        const status = window.cacheManager.status();
        setCacheStatus(status);
      } catch (error) {
        console.error('Failed to load cache status:', error);
      }
    }
  };

  const handleFlushCache = async () => {
    if (!window.cacheManager) {
      toast.error('Cache manager not available');
      return;
    }

    try {
      toast.info('Flushing buffer to journal...');
      
      // Flush in-memory buffer to disk journal (C:/malwa-crm/Cache/change_journal.json)
      const result = await window.cacheManager.flushBuffer();
      
      if (result && result.success !== false) {
        toast.success(`Buffer flushed: ${result?.changesFlushed || 0} changes saved to journal`);
        loadCacheStatus();
      } else {
        toast.warning('Buffer flush completed with warnings');
        loadCacheStatus();
      }
    } catch (error) {
      console.error('Failed to flush cache:', error);
      toast.error(`Failed to flush buffer: ${error.message || 'Unknown error'}`);
    }
  };

  const handleForceUpload = async () => {
    if (!window.cacheManager) {
      toast.error('Cache manager not available');
      return;
    }

    try {
      toast.info('Starting force upload to file system...');
      
      // Upload all pending changes from journal to File System (C:/malwa-crm/Data_base/)
      const result = await window.cacheManager.uploadNow();
      
      if (result && result.success) {
        const uploaded = result.uploaded || 0;
        const failed = result.failed || 0;
        
        if (failed > 0) {
          toast.warning(`Upload completed: ${uploaded} successful, ${failed} failed`);
        } else {
          toast.success(`Upload successful: ${uploaded} changes synced to file system`);
        }
        loadCacheStatus();
      } else {
        toast.error(result?.error || 'Upload failed - File system may not be available');
        loadCacheStatus();
      }
    } catch (error) {
      console.error('Failed to upload cache:', error);
      toast.error(`Upload failed: ${error.message || 'File system not available'}`);
    }
  };
  
  const loadRolesAndPermissions = async () => {
    try {
      // Load roles from role definitions
      const allRoles = getAllRoles();
      const rolesData = allRoles.map(roleName => ({
        id: roleName.toLowerCase().replace(/\s+/g, '-'),
        name: roleName,
        ...getRoleConfig(roleName)
      }));
      
      const permissionsData = await dbOperations.getAll('permissions') || [];
      setRoles(rolesData);
      setPermissions(permissionsData);
    } catch (error) {
      console.error('Error loading roles and permissions:', error);
    }
  };
  
  const [formData, setFormData] = useState({
    username: '',
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'Accountant',
    status: 'Active',
    pageAccess: {
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
      settings: { enabled: false, subPages: { general: false, myProfile: false, companyMaster: false, rateListMemory: false, userManagement: false, security: false, about: false } }
    }
  });

  // Page access configuration with display names (matching Sidebar.jsx navigation)
  const pageAccessConfig = [
    { key: 'dashboard', label: 'Dashboard', subPages: [] },
    {
      key: 'jobs',
      label: 'Jobs',
      subPages: [
        { key: 'inspectionStep', label: 'Inspection Step' },
        { key: 'estimateStep', label: 'Estimate Step' },
        { key: 'jobSheetStep', label: 'Job Sheet Step' },
        { key: 'chalanStep', label: 'Labour Bill' },
        { key: 'invoiceStep', label: 'Invoice Step' }
      ]
    },
    { key: 'om', label: 'O & M', subPages: [] },
    {
      key: 'customer',
      label: 'Customer', 
      subPages: [
        { key: 'customerDetailsTab', label: 'Customer Details' },
        { key: 'customerLedgerTab', label: 'Customer Ledger' },
        { key: 'leadsTab', label: 'Leads' }
      ]
    },
    { 
      key: 'vendors', 
      label: 'Vendors', 
      subPages: [
        { key: 'vendorDetailsTab', label: 'Vendor Details' },
        { key: 'vendorLedgerTab', label: 'Vendor Ledger' }
      ]
    },
    { 
      key: 'labour',
      label: 'Employee',
      subPages: [
        { key: 'labourDetailsTab', label: 'Employee Details' },
        { key: 'labourLedgerTab', label: 'Employee Ledger' }
      ]
    },
    { 
      key: 'supplier', 
      label: 'Supplier', 
      subPages: [
        { key: 'supplierDetailsTab', label: 'Supplier Details' },
        { key: 'supplierLedgerTab', label: 'Supplier Ledger' }
      ]
    },
    { 
      key: 'inventory', 
      label: 'Inventory', 
      subPages: [
        { key: 'stockTab', label: 'Stock Management' },
        { key: 'categoryManager', label: 'Category Manager' },
        { key: 'stockMovements', label: 'Stock Movements' }
      ]
    },
    { 
      key: 'accounts', 
      label: 'Accounts', 
      subPages: [
        { key: 'purchase', label: 'Purchase' },
        { key: 'voucher', label: 'Voucher' },
        { key: 'otherExpenses', label: 'Other Expenses' },
        { key: 'invoice', label: 'Invoice' },
        { key: 'challan', label: 'Challan' },
        { key: 'sellchallan', label: 'Sell Challan' },
        { key: 'cashReceipt', label: 'Cash Receipt' },
        { key: 'gstledger', label: 'GST Ledger' }
      ]
    },
    { 
      key: 'summary', 
      label: 'Summary', 
      subPages: []
    },
    { key: 'dailyTasks', label: 'Daily Tasks', subPages: [] },
    { 
      key: 'settings', 
      label: 'Settings', 
      subPages: [
        { key: 'general', label: 'General' },
        { key: 'myProfile', label: 'My Profile' },
        { key: 'companyMaster', label: 'Company Master' },
        { key: 'rateListMemory', label: 'Rate List Memory' },
        { key: 'userManagement', label: 'User Management' },
        { key: 'security', label: 'Security' },
        { key: 'about', label: 'About' }
      ]
    }
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRoleChange = (e) => {
    const role = e.target.value;
    
    // Get page access from role configuration
    const roleConfig = getRoleConfig(role);
    const updatedAccess = roleConfig?.pageAccess || formData.pageAccess;

    setFormData(prev => ({ ...prev, role, pageAccess: updatedAccess }));
  };

  // Validation removed - users can enter any format

  // Validation removed - users can enter any format

  const handleAddUser = async (e) => {
    e.preventDefault();
    
    // Validations
    if (!formData.username || !formData.name || !formData.email || !formData.password) {
      toast.error('Please fill in all required fields');
      return;
    }

    // All validations removed - accept any input

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    try {
      // Removed uniqueness check - allow duplicate usernames

      // Hash password
      const encoder = new TextEncoder();
      const data = encoder.encode(formData.password);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashedPassword = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      // Generate user ID
      const userId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });

      const timestamp = new Date().toISOString();

      // Create user (use username for login identifier in email field)
      await dbOperations.insert('users', {
        id: userId,
        email: formData.username, // Username used as login identifier
        password: hashedPassword,
        created_at: timestamp
      });

      // Get role ID from roles table
      const allRoles = await dbOperations.getAll('roles') || [];
      const selectedRoleObj = allRoles.find(r => r.name === formData.role);
      const roleId = selectedRoleObj?.id || null;

      // Get permissions for this role
      const allPermissions = await dbOperations.getAll('permissions') || [];
      const rolePermissions = allPermissions.filter(p => p.roleId === roleId);
      
      // Organize permissions by resource
      const permissionsByResource = {};
      rolePermissions.forEach(perm => {
        if (!permissionsByResource[perm.resource]) {
          permissionsByResource[perm.resource] = [];
        }
        permissionsByResource[perm.resource].push(perm.action);
      });

      // Create profile with complete user information
      await dbOperations.insert('profiles', {
        id: userId,
        name: formData.name,
        email: formData.email,
        username: formData.username,
        role: formData.role,
        roleId: roleId,
        status: formData.status,
        permissions: permissionsByResource,
        created_at: timestamp,
        last_login: null,
        updated_at: timestamp
      });

      // Save page visibility with proper ID
      await dbOperations.insert('user_page_visibility', {
        id: 'visibility_' + userId,
        userId: userId,
        pageAccess: formData.pageAccess,
        created_at: timestamp,
        updated_at: timestamp
      });

      // Create audit log
      await dbOperations.insert('audit_logs', {
        id: 'log_' + Date.now(),
        action: 'USER_CREATED',
        performedBy: user?.id || 'system',
        targetUser: userId,
        details: {
          username: formData.username,
          name: formData.name,
          email: formData.email,
          role: formData.role
        },
        timestamp: timestamp
      });

      // Sync to new backend
      const allUsers = await dbOperations.getAll('users');
      await saveUsers(allUsers);

      // Create individual user JSON file with complete credentials and permissions
      const completeUserData = {
        id: userId,
        username: formData.username,
        name: formData.name,
        email: formData.email,
        password: hashedPassword,
        role: formData.role,
        roleId: roleId,
        status: formData.status,
        permissions: permissionsByResource,
        pageAccess: formData.pageAccess,
        created_at: timestamp,
        last_login: null,
        updated_at: timestamp
      };

      // Create individual user JSON file in backend
      await createUserFile(completeUserData);
      
      // Save page access to dedicated file
      const pageAccessData = {
        userId: userId,
        username: formData.username,
        pageAccess: formData.pageAccess,
        created_at: timestamp,
        updated_at: timestamp
      };
      await saveUserPageAccess(pageAccessData);

      toast.success('User created successfully!');
      
      // Sync all data to backend files
      if (window.electron?.fs?.writeFile) {
        try {
          const [allUsersUpdated, allProfiles, allVisibility] = await Promise.all([
            dbOperations.getAll('users'),
            dbOperations.getAll('profiles'),
            dbOperations.getAll('user_page_visibility')
          ]);
          
          await Promise.all([
            saveUsers(allUsersUpdated),
            window.electron.fs.writeFile(
              'C:/malwa-crm/Data_base/Settings_Module/profiles.json',
              JSON.stringify(allProfiles, null, 2)
            ),
            window.electron.fs.writeFile(
              'C:/malwa-crm/Data_base/Settings_Module/user-page-visibility.json',
              JSON.stringify(allVisibility, null, 2)
            )
          ]);
          
          console.log('✅ User data synced to backend successfully');
        } catch (err) {
          console.error('❌ Failed to sync user data to backend:', err);
        }
      }
      
      // Broadcast data change
      broadcastDataChange('user_page_visibility', 'created', { userId, pageAccess: formData.pageAccess });
      
      setIsAddUserModalOpen(false);
      loadAllUsers(); // Reload users to update statistics
      setFormData({
        username: '',
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'Accountant',
        status: 'Active',
        pageAccess: {
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
          settings: { enabled: false, subPages: { general: false, myProfile: false, companyMaster: false, rateListMemory: false, userManagement: false, security: false, about: false } }
        }
      });
    } catch (error) {
      const errorDetails = {
        operation: 'CREATE_USER',
        username: formData.username,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      };
      console.error('🚨 Error creating user:', errorDetails);
      
      // Show detailed error message
      toast.error(`Failed to create user: ${error.message}`, {
        description: 'Please check the form data and try again',
        duration: 5000
      });
    }
  };

  // Load all users (excluding Super Admin)
  const loadAllUsers = async () => {
    setLoadingUsers(true);
    try {
      // Try loading from new backend first
      const backendResult = await loadUsers();
      let users, profiles, visibilityRecords;
      
      if (backendResult.success && backendResult.data && backendResult.data.length > 0) {
        // Use backend data
        users = backendResult.data;
        profiles = await dbOperations.getAll('profiles');
        visibilityRecords = await dbOperations.getAll('user_page_visibility');
      } else {
        // Fallback to IndexedDB
        users = await dbOperations.getAll('users');
        profiles = await dbOperations.getAll('profiles');
        visibilityRecords = await dbOperations.getAll('user_page_visibility');
        
        // Sync to new backend
        await saveUsers(users);
      }

      // Filter out Super Admin from regular user management
      const regularUsers = users.filter(u => u.id !== 'super-admin-sheddy-001' && u.email !== 'Shahidmultaniii');

      const usersWithDetails = regularUsers.map(u => {
        const userProfile = profiles.find(p => p.id === u.id);
        const visibility = visibilityRecords.find(v => v.userId === u.id);
        return {
          ...u,
          profile: userProfile,
          pageAccess: visibility?.pageAccess
        };
      });

      setAllUsers(usersWithDetails);
    } catch (error) {
      const errorDetails = {
        operation: 'LOAD_USERS',
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      };
      console.error('🚨 Error loading users:', errorDetails);
      
      toast.error(`Failed to load users: ${error.message}`, {
        description: 'Unable to fetch user data from database',
        duration: 5000,
        action: {
          label: 'Retry',
          onClick: () => loadAllUsers()
        }
      });
      
      // Set empty array as fallback
      setAllUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Delete user
  const handleDeleteUser = async (userId) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      // Delete from users table
      await dbOperations.delete('users', userId);
      
      // Delete from profiles table
      await dbOperations.delete('profiles', userId);
      
      // Delete from user_page_visibility table
      const visibilityRecords = await dbOperations.getAll('user_page_visibility');
      const userVisibility = visibilityRecords.find(v => v.userId === userId);
      if (userVisibility) {
        await dbOperations.delete('user_page_visibility', userVisibility.id);
      }

      // Create audit log
      await dbOperations.insert('audit_logs', {
        id: 'log_' + Date.now(),
        action: 'USER_DELETED',
        performedBy: user?.id || 'system',
        targetUser: userId,
        details: { userId },
        timestamp: new Date().toISOString()
      });

      // Sync to new backend
      const allUsers = await dbOperations.getAll('users');
      await saveUsers(allUsers);

      toast.success('User deleted successfully!');
      loadAllUsers(); // Reload users
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
    }
  };

  // Open edit modal
  const handleEditUser = (userToEdit) => {
    setSelectedUser(userToEdit);
    setFormData({
      username: userToEdit.email,
      name: userToEdit.profile?.name || '',
      email: userToEdit.profile?.email || '',
      password: '',
      confirmPassword: '',
      role: userToEdit.profile?.role || 'Accountant',
      status: userToEdit.profile?.status || 'Active',
      pageAccess: userToEdit.pageAccess || {
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
        settings: { enabled: false, subPages: { general: false, myProfile: false, companyMaster: false, rateListMemory: false, userManagement: false, security: false, about: false } }
      }
    });
    setIsEditUserModalOpen(true);
  };

  // Update user
  const handleUpdateUser = async (e) => {
    e.preventDefault();

    if (!selectedUser) return;

    try {
      const timestamp = new Date().toISOString();

      // Update profile
      await dbOperations.update('profiles', selectedUser.id, {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        status: formData.status,
        updated_at: timestamp
      });

      // Update page visibility
      const visibilityRecords = await dbOperations.getAll('user_page_visibility');
      const userVisibility = visibilityRecords.find(v => v.userId === selectedUser.id);
      
      if (userVisibility) {
        await dbOperations.update('user_page_visibility', userVisibility.id, {
          pageAccess: formData.pageAccess,
          updated_at: timestamp
        });
        
        // Sync page access to file system
        const updatedProfile = await dbOperations.getById('profiles', selectedUser.id);
        const pageAccessData = {
          userId: selectedUser.id,
          username: updatedProfile.username,
          pageAccess: formData.pageAccess,
          created_at: userVisibility.created_at,
          updated_at: timestamp
        };
        await saveUserPageAccess(pageAccessData);
        
        // Broadcast data change
        broadcastDataChange('user_page_visibility', 'updated', { userId: selectedUser.id, pageAccess: formData.pageAccess });
      } else {
        await dbOperations.insert('user_page_visibility', {
          id: 'visibility_' + selectedUser.id,
          userId: selectedUser.id,
          pageAccess: formData.pageAccess,
          created_at: timestamp,
          updated_at: timestamp
        });
        
        // Sync new page access to file system
        const updatedProfile = await dbOperations.getById('profiles', selectedUser.id);
        const pageAccessData = {
          userId: selectedUser.id,
          username: updatedProfile.username,
          pageAccess: formData.pageAccess,
          created_at: timestamp,
          updated_at: timestamp
        };
        await saveUserPageAccess(pageAccessData);
        
        // Broadcast data change
        broadcastDataChange('user_page_visibility', 'created', { userId: selectedUser.id, pageAccess: formData.pageAccess });
      }

      // Update password if provided
      if (formData.password && formData.password.length > 0) {
        if (formData.password !== formData.confirmPassword) {
          toast.error('Passwords do not match');
          return;
        }

        // Hash new password
        const encoder = new TextEncoder();
        const data = encoder.encode(formData.password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashedPassword = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        await dbOperations.update('users', selectedUser.id, {
          password: hashedPassword
        });
      }

      // Create audit log
      await dbOperations.insert('audit_logs', {
        id: 'log_' + Date.now(),
        action: 'USER_UPDATED',
        performedBy: user?.id || 'system',
        targetUser: selectedUser.id,
        details: {
          name: formData.name,
          email: formData.email,
          role: formData.role,
          status: formData.status
        },
        timestamp: timestamp
      });

      toast.success('User updated successfully!');
      setIsEditUserModalOpen(false);
      setSelectedUser(null);
      loadAllUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Failed to update user');
    }
  };

  // Handle password verification success
  const handlePasswordSuccess = () => {
    setIsPasswordModalOpen(false);
    setIsAccessGranted(true);
    toast.success('🔓 Access granted to User Management');
  };

  // Handle password verification cancel
  const handlePasswordCancel = () => {
    setIsPasswordModalOpen(false);
    toast.info('User Management access denied');
    // Optionally redirect user back or show message
  };

  // Filter users based on search
  const filteredUsers = allUsers.filter(u => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      u.profile?.name?.toLowerCase().includes(query) ||
      u.profile?.email?.toLowerCase().includes(query) ||
      u.email?.toLowerCase().includes(query) ||
      u.profile?.role?.toLowerCase().includes(query)
    );
  });

  // Show password modal first
  if (!isAccessGranted) {
    return (
      <>
        <AdminPasswordModal
          isOpen={isPasswordModalOpen}
          onSuccess={handlePasswordSuccess}
          onCancel={handlePasswordCancel}
        />
        
        {/* Blocked content message */}
        <div className="flex items-center justify-center h-96">
          <Card className="max-w-md w-full">
            <div className="text-center space-y-4 p-8">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto">
                <Shield className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Protected Area
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                User Management requires Super Admin password verification.
              </p>
              <Button 
                onClick={() => setIsPasswordModalOpen(true)}
                className="mt-4"
              >
                <Shield className="w-4 h-4 mr-2" />
                Verify Password
              </Button>
            </div>
          </Card>
        </div>
      </>
    );
  }

  return (
    <div className="space-y-6">
      {/* Manage Users Modal */}
      <Modal isOpen={isManageUsersModalOpen} onClose={() => setIsManageUsersModalOpen(false)} title="Manage Users" size="2xl">
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search users by name, email, or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red"
            />
          </div>

          {/* Users Table */}
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            {loadingUsers ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-red"></div>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No users found
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                  <tr>
                    <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">User</th>
                    <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Role</th>
                    <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Created</th>
                    <th className="px-2 py-1 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-4 py-3">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full bg-brand-red flex items-center justify-center text-white font-bold mr-3">
                            {u.profile?.name?.charAt(0)?.toUpperCase() || 'U'}
                          </div>
                          <div>
                            <p className="font-medium dark:text-dark-text">{u.profile?.name || 'Unknown'}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{u.profile?.email || u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                          {u.profile?.role || 'User'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          u.profile?.status === 'Active' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}>
                          {u.profile?.status || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-2 py-1 text-sm text-gray-500 dark:text-gray-400">
                        {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-2 py-1 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleEditUser(u)}
                            className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                            title="Edit User"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u.id)}
                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                            title="Delete User"
                            disabled={u.id === user?.id}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="flex justify-between items-center pt-4 border-t dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Total Users: {allUsers.length} | Active: {allUsers.filter(u => u.profile?.status === 'Active').length}
            </p>
            <Button variant="secondary" onClick={() => setIsManageUsersModalOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit User Modal */}
      <Modal isOpen={isEditUserModalOpen} onClose={() => setIsEditUserModalOpen(false)} title="Edit User" size="xl">
        <form onSubmit={handleUpdateUser} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium mb-2 dark:text-dark-text">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full p-3 border rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red"
                placeholder="Enter full name"
                required
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium mb-2 dark:text-dark-text">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full p-3 border rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red"
                placeholder="Enter email or identifier"
                required
              />
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-medium mb-2 dark:text-dark-text">
                Role <span className="text-red-500">*</span>
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={handleRoleChange}
                className="w-full p-3 border rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red"
                required
              >
                <option value="">Select Role</option>
                {roles.map(role => (
                  <option key={role.id} value={role.name}>{role.name}</option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium mb-2 dark:text-dark-text">
                Account Status <span className="text-red-500">*</span>
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="w-full p-3 border rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red"
              >
                <option value="Active">✅ Active</option>
                <option value="Inactive">⛔ Inactive</option>
              </select>
            </div>

            {/* New Password (Optional) */}
            <div>
              <label className="block text-sm font-medium mb-2 dark:text-dark-text">
                New Password (Optional)
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full p-3 pr-10 border rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red"
                  placeholder="Leave blank to keep current"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium mb-2 dark:text-dark-text">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className="w-full p-3 pr-10 border rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red"
                  placeholder="Confirm new password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsEditUserModalOpen(false);
                setSelectedUser(null);
              }}
              className="px-6 py-2"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
            >
              <Edit className="w-4 h-4 mr-2" />
              Update User
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add User Modal */}
      <Modal isOpen={isAddUserModalOpen} onClose={() => setIsAddUserModalOpen(false)} title="Add New User" size="xl">
        <form onSubmit={handleAddUser} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Username */}
            <div>
              <label className="block text-sm font-medium mb-2 dark:text-dark-text">
                Username <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                className="w-full p-3 border rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red"
                placeholder="Enter username"
                required
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Any format allowed</p>
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium mb-2 dark:text-dark-text">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full p-3 border rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red"
                placeholder="Enter full name"
                required
                minLength={2}
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium mb-2 dark:text-dark-text">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full p-3 border rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red"
                placeholder="user@example.com"
                required
              />
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-medium mb-2 dark:text-dark-text">
                Role <span className="text-red-500">*</span>
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={handleRoleChange}
                className="w-full p-3 border rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red"
                required
              >
                <option value="">Select Role</option>
                {roles.map(role => (
                  <option key={role.id} value={role.name}>{role.name}</option>
                ))}
              </select>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium mb-2 dark:text-dark-text">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full p-3 pr-10 border rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red"
                  placeholder="Enter password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Any format allowed
              </p>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium mb-2 dark:text-dark-text">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className="w-full p-3 pr-10 border rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red"
                  placeholder="Re-enter password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Status Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div>
              <label className="block text-sm font-medium dark:text-dark-text">Account Status</label>
              <p className="text-xs text-gray-500 dark:text-gray-400">Active users can log in immediately</p>
            </div>
            <select
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              className="p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red"
            >
              <option value="Active">✅ Active</option>
              <option value="Inactive">⛔ Inactive</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsAddUserModalOpen(false);
                setFormData({
                  username: '',
                  name: '',
                  email: '',
                  password: '',
                  confirmPassword: '',
                  role: 'Accountant',
                  status: 'Active',
                  pageAccess: {
                    dashboard: true,
                    jobs: { enabled: true, subPages: { inspectionStep: true, estimateStep: true, jobSheetStep: true, chalanStep: true, invoiceStep: true } },
                    customer: { enabled: true, subPages: { customerDetailsTab: true, customerLedgerTab: true, leadsTab: true } },
                    vendors: { enabled: true, subPages: { vendorDetailsTab: true, vendorLedgerTab: true } },
                    labour: { enabled: true, subPages: { labourDetailsTab: true, labourLedgerTab: true, labourLedgerView: true } },
                    supplier: { enabled: true, subPages: { supplierDetailsTab: true, supplierLedgerTab: true } },
                    inventory: { enabled: true, subPages: { stockTab: true, categoryManager: true, stockMovements: true } },
                    accounts: { enabled: true, subPages: { purchase: true, voucher: true, otherExpenses: true, invoice: true, challan: true, sellchallan: true, cashReceipt: true, gstledger: true } },
                    summary: { enabled: true, subPages: { incentiveSummary: true, penaltyCard: true, summaryDashboard: true } },
                    dailyTasks: true,
                    settings: { enabled: false, subPages: { myProfileTab: false, generalSettingsTab: false, companyMasterTab: false, multiplierSettingsTab: false, rateListMemoryTab: false, userManagementTab: false, securitySettingsTab: false, backupSettingsTab: false, auditLogsTab: false, aboutTab: false } }
                  }
                });
              }}
              className="px-6 py-2"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Create User
            </Button>
          </div>
        </form>
      </Modal>
      {/* Super Admin Powers Card */}
      <Card className="bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 border-red-100 dark:border-red-800">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Shield className="text-brand-red" size={28} />
              <div>
                <h2 className="text-xl font-bold text-brand-red">Super Admin Powers</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">Highest level access - All modules unlocked</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/30 rounded-full">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-semibold text-green-700 dark:text-green-300">Full Access Active</span>
            </div>
          </div>

          {/* Statistics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{allUsers.length}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Total Users</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <UserCircle className="w-8 h-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{allUsers.filter(u => u.profile?.status === 'Active').length}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Active Users</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <Clock className="w-8 h-8 text-orange-500" />
                <div>
                  <p className="text-lg font-bold text-orange-600 dark:text-orange-400">Never</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Last Backup</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <Database className="w-8 h-8 text-purple-500" />
                <div>
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">v13</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Database Version</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div>
            <h3 className="text-base font-bold text-brand-red mb-3">Quick Actions</h3>
            <div className="flex flex-wrap gap-3">
              <Button 
                onClick={() => setIsAddUserModalOpen(true)}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-lg font-medium shadow-md"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Add User
              </Button>
              <Button 
                onClick={() => {
                  loadAllUsers();
                  setIsManageUsersModalOpen(true);
                }}
                className="bg-brand-red hover:bg-red-700 text-white px-6 py-2.5 rounded-lg font-medium shadow-md"
              >
                <Users className="w-4 h-4 mr-2" />
                Manage Users
              </Button>
              <Button 
                onClick={() => setIsManagePermissionsModalOpen(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2.5 rounded-lg font-medium shadow-md"
              >
                <Shield className="w-4 h-4 mr-2" />
                Manage Permissions
              </Button>
              <Button 
                onClick={() => {
                  loadCacheStatus();
                  setIsCacheManagerModalOpen(true);
                }}
                className="bg-brand-red hover:bg-red-700 text-white px-6 py-2.5 rounded-lg font-medium shadow-md"
              >
                <HardDrive className="w-4 h-4 mr-2" />
                Cache Manager
              </Button>
              <Button
                onClick={() => setIsSettlementAuditOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium shadow-md"
              >
                <Clock className="w-4 h-4 mr-2" />
                Audit Logs
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* System Information */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold dark:text-dark-text">1</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Users</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <UserCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold dark:text-dark-text">1</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Active Users</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Shield className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold dark:text-dark-text">v13</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Database Version</p>
            </div>
          </div>
        </Card>
      </div>
      
      {/* Manage Permissions Modal */}
      <ManagePermissionsModal
        isOpen={isManagePermissionsModalOpen}
        onClose={() => setIsManagePermissionsModalOpen(false)}
      />

      {/* Settlement Audit Modal */}
      <SettlementAuditModal
        isOpen={isSettlementAuditOpen}
        onClose={() => setIsSettlementAuditOpen(false)}
      />

      {/* Cache Manager Modal */}
      <Modal
        isOpen={isCacheManagerModalOpen}
        onClose={() => setIsCacheManagerModalOpen(false)}
        title="Cache Manager"
        size="lg"
      >
        <div className="space-y-6">
          {/* Cache Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-gray-600 dark:text-gray-400">Status</p>
              <p className="text-lg font-semibold text-blue-900 dark:text-blue-300">
                {cacheStatus?.enabled ? 'Enabled' : 'Disabled'}
              </p>
            </div>
            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
              <p className="text-sm text-gray-600 dark:text-gray-400">Mode</p>
              <p className="text-lg font-semibold text-purple-900 dark:text-purple-300">
                {cacheStatus?.browserMode ? 'Browser' : 'File System'}
              </p>
            </div>
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <p className="text-sm text-gray-600 dark:text-gray-400">Buffered Changes</p>
              <p className="text-lg font-semibold text-green-900 dark:text-green-300">
                {cacheStatus?.pendingChanges || 0}
              </p>
            </div>
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Changes</p>
              <p className="text-lg font-semibold text-yellow-900 dark:text-yellow-300">
                {cacheStatus?.totalChanges || 0}
              </p>
            </div>
          </div>

          {/* Next Upload Time */}
          {cacheStatus?.nextUploadTime && (
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Next Scheduled Upload</p>
              <p className="text-base font-medium dark:text-dark-text">
                {new Date(cacheStatus.nextUploadTime).toLocaleString()}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => {
                loadCacheStatus();
                toast.success('Status refreshed');
              }}
              variant="secondary"
            >
              <Database className="w-4 h-4 mr-2" />
              Refresh Status
            </Button>
            <Button
              onClick={handleFlushCache}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <HardDrive className="w-4 h-4 mr-2" />
              Flush Buffer
            </Button>
            <Button
              onClick={handleForceUpload}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Database className="w-4 h-4 mr-2" />
              Force Upload
            </Button>
          </div>

          {/* Info Message */}
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              <strong>Note:</strong> The cache system automatically uploads changes every 8 hours. 
              Use "Flush Buffer" to save current changes to the journal, and "Force Upload" to 
              immediately sync all changes to the file system.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default UserManagementTab;

