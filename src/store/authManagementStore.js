/**
 * Unified Authentication Management Store
 * Combines: authStore.js + permissionStore.js + userManagementStore.js + previewStore.js
 * Handles authentication, permissions, user management, and preview mode
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authService } from '@/lib/auth';
import cachedDb from '@/utils/cachedDbOperations';
const dbOperations = cachedDb;
import { toast } from 'sonner';
import { getUserPermissions, saveUserPermissions, hasPermission, hasAnyPermission } from '@/utils/permissionHelpers';
import { isGstOnlyRole } from '@/utils/roleDefinitions';
import { isApiModeEnabled, clearAccessToken } from '@/api/client';
import { apiLogin, apiLogout } from '@/api/auth';
import { startWebSyncListeners } from '@/utils/webSyncQueue';

const useAuthManagementStore = create(
  persist(
    (set, get) => ({
  // === AUTHENTICATION STATE ===
  isAuthenticated: false,
  user: null,
  profile: null,
  authLoading: false,

  // === PERMISSIONS STATE (ROLE-BASED) ===
  permissions: [],
  permissionsLoading: false,
  permissionsInitialized: false,
  currentRole: null, // User's assigned role

  // === USER MANAGEMENT STATE ===
  users: [],
  branches: [],
  userManagementLoading: false,

  // === PREVIEW MODE STATE ===
  isPreviewMode: false,
  originalPermissions: [],
  previewUser: null,

  // === AUTHENTICATION ACTIONS ===
  initialize: async () => {
    const state = get();
    
    // If already authenticated from persisted state, no need to re-initialize
    if (state.isAuthenticated && state.user) {
      console.log('👑 Restored authentication from persistent storage:', state.user.name);
      
      // Load role if not already set
      if (!state.currentRole && state.profile?.role) {
        set({ currentRole: state.profile.role });
      }
      
      return;
    }

    const user = await authService.getUser();
    const profile = await authService.getProfile();

    set({
      isAuthenticated: !!user,
      user,
      profile,
      currentRole: profile?.role || null
    });

    // Load permissions if user exists (except Super Admin who has god-mode access)
    if (user?.id && user.id !== 'super-admin-sheddy-001' && user.email !== 'Shahidmultaniii') {
      get().loadPermissions(user.id);
    } else if (user?.id === 'super-admin-sheddy-001' || user?.email === 'Shahidmultaniii') {
      // Super Admin - set permissions as initialized without database loading
      set({ permissionsInitialized: true, permissionsLoading: false, currentRole: 'Super Admin' });
    }
  },

  login: async (email, password) => {
    // === WEB API MODE (Option B) — server auth, no hardcoded passwords ===
    if (isApiModeEnabled()) {
      set({ authLoading: true });
      try {
        const data = await apiLogin(email, password);
        const user = data?.user;
        if (!user?.id) {
          throw new Error(
            data?.detail ||
              'Login response missing user. Check VITE_API_URL / Nginx /api proxy to Docker :8015.'
          );
        }
        const profile = data.profile || {
          id: user.id,
          name: user.name || user.email,
          email: user.email,
          role: user.role,
          permissions: user.role === 'Super Admin' ? ['*'] : [],
          status: user.status || 'active',
        };

        const gstOnly = isGstOnlyRole(profile?.role);
        if (gstOnly) profile.gstOnlyMode = true;

        set({
          isAuthenticated: true,
          user,
          profile,
          authLoading: false,
          currentRole: profile?.role || user.role || null,
          permissionsInitialized: profile?.role === 'Super Admin' || profile?.permissions?.[0] === '*',
          permissionsLoading: false,
          permissions: profile?.role === 'Super Admin' || profile?.permissions?.[0] === '*' ? ['*'] : [],
        });

        if (profile?.role !== 'Super Admin' && profile?.permissions?.[0] !== '*') {
          try {
            await get().loadPermissions(user.id);
          } catch (permErr) {
            console.warn('[AUTH] Permission load skipped (API mode):', permErr);
            set({ permissionsInitialized: true });
          }
        }

        startWebSyncListeners();
        return true;
      } catch (error) {
        console.error('🚨 API Login error:', error);
        toast.error(error.message || 'Login failed — check API / credentials');
        set({ authLoading: false });
        return false;
      }
    }

    // Hardcoded Super Admin — LEGACY DESKTOP ONLY (disabled when VITE_USE_API=true)
    if (email === 'Shahidmultaniii' && password === 'S#d_8224') {
      const superAdmin = {
        id: 'super-admin-sheddy-001',
        email: 'Shahidmultaniii',
        name: 'Sheddy Smith',
        role: 'Super Admin (God Mode)',
        permissions: ['*']
      };

      // Create persistent session for Super Admin
      const session = {
        user: superAdmin,
        profile: superAdmin,
        expiresAt: Date.now() + (365 * 24 * 60 * 60 * 1000), // 1 year expiry
        persistent: true
      };
      localStorage.setItem('malwa_crm_session', JSON.stringify(session));
      
      set({ 
        user: superAdmin, 
        profile: superAdmin,
        isAuthenticated: true,
        permissionsInitialized: true,
        permissionsLoading: false,
        currentRole: 'Super Admin'
      });
      return true;
    }
    
    // Regular login process (legacy IndexedDB / desktop)
    set({ authLoading: true });
    try {
      const { user, profile, error } = await authService.signIn({ email, password });

      if (error) {
        set({ authLoading: false });
        return false;
      }

      // Check if user role requires GST-only mode
      const gstOnly = isGstOnlyRole(profile?.role);
      if (gstOnly) {
        profile.gstOnlyMode = true;
      }

      set({
        isAuthenticated: true,
        user,
        profile,
        authLoading: false,
        currentRole: profile?.role || null
      });

      // Load user permissions after login (except Super Admin who has god-mode access)
      if (user?.id && user.id !== 'super-admin-sheddy-001' && user.email !== 'Shahidmultaniii') {
        console.log('📥 [AUTH] Loading role-based permissions for user:', user.id, 'Role:', profile?.role);
        await get().loadPermissions(user.id);
        console.log('✅ [AUTH] Permissions loaded');
      } else if (user?.id === 'super-admin-sheddy-001' || user?.email === 'Shahidmultaniii') {
        // Super Admin - set permissions as initialized without database loading
        console.log('👑 [AUTH] Super Admin detected - setting god-mode permissions');
        set({ permissionsInitialized: true, permissionsLoading: false, permissions: ['*'], currentRole: 'Super Admin' });
      }

      return true;
    } catch (error) {
        console.error('🚨 Login error:', {
          error: error.message,
          stack: error.stack,
          email: email,
          timestamp: new Date().toISOString()
        });
        
        // Use enhanced error logger
        if (window.errorLogger) {
          await window.errorLogger.logAuthError(error, {
            operation: 'LOGIN',
            email: email,
            silent: false
          });
        }      set({ authLoading: false });
      return false;
    }
  },

  logout: async () => {
    if (isApiModeEnabled()) {
      try {
        await apiLogout();
      } catch (e) {
        clearAccessToken();
        console.warn('[AUTH] API logout:', e);
      }
    } else {
      await authService.signOut();
    }
    
    // Clear all authentication and permission state
    set({
      isAuthenticated: false,
      user: null,
      profile: null,
      permissions: [],
      permissionsLoading: false,
      permissionsInitialized: false,
      currentRole: null,
      isPreviewMode: false,
      originalPermissions: [],
      previewUser: null
    });
  },

  updateProfile: async (updates) => {
    const currentProfile = get().profile;
    const currentUser = get().user;
    if (!currentProfile || !currentUser) return;

    const updatedProfile = { ...currentProfile, ...updates };
    
    // Update Zustand state immediately for UI feedback
    set({ profile: updatedProfile });

    // Persist to Electron file system if available
    if (window.electron?.profile?.saveData && currentUser.id) {
      try {
        const saveResult = await window.electron.profile.saveData(currentUser.id, updatedProfile);
        if (!saveResult.success) {
          console.error('Failed to persist profile updates:', saveResult.error);
        }

        // If photo was updated, save it separately
        if (updates.photo) {
          const photoResult = await window.electron.profile.savePhoto(currentUser.id, updates.photo);
          if (!photoResult.success) {
            console.error('Failed to persist profile photo:', photoResult.error);
          }
        }
      } catch (error) {
        console.error('Error persisting profile updates:', error);
      }
    }
  },

  // Direct authentication setter (for programmatic login)
  setAuthentication: ({ isAuthenticated, user, profile }) => {
    set({
      isAuthenticated,
      user,
      profile,
      authLoading: false,
      currentRole: profile?.role || null
    });

    // Load permissions if user exists
    if (user?.id) {
      get().loadPermissions(user.id);
    }
  },

  // === PERMISSION ACTIONS (ROLE-BASED) ===
  loadPermissions: async (userId) => {
    if (!userId) {
      console.warn('⚠️ [PERMISSIONS] No userId provided');
      set({ permissions: [], permissionsLoading: false, permissionsInitialized: true });
      return;
    }

    console.log('🔄 [PERMISSIONS] Loading role-based permissions for userId:', userId);
    set({ permissionsLoading: true });
    try {
      const userPermissions = await getUserPermissions(userId);
      console.log('✅ [PERMISSIONS] Loaded permissions:', {
        count: userPermissions.length,
        permissions: userPermissions.slice(0, 5), // Show first 5
        hasWildcard: userPermissions.includes('*')
      });
      set({ permissions: userPermissions, permissionsLoading: false, permissionsInitialized: true });
    } catch (error) {
        console.error('🚨 [PERMISSIONS] Error loading permissions:', {
          userId,
          error: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString()
        });
        
        // Use enhanced error logger
        if (window.errorLogger) {
          await window.errorLogger.logPermissionError(error, {
            operation: 'LOAD_PERMISSIONS',
            userId: userId,
            silent: true // Don't show toast for permission loading errors
          });
        }      
        // Set empty permissions on error
        set({ permissions: [], permissionsLoading: false, permissionsInitialized: true });
    }
  },

  updatePermissions: async (userId, newPermissions, actorId = null) => {
    console.warn('⚠️ [PERMISSIONS] updatePermissions is deprecated. Use role assignment instead.');
    // This method is now deprecated in favor of role-based permissions
    // Kept for backward compatibility but should not save per-user permissions
    return false;
  },

  // NEW: Update user role (primary method for permission management)
  updateUserRole: async (userId, newRole, actorId = null) => {
    try {
      const success = await saveUserPermissions(userId, [], actorId); // Placeholder, actual role update happens in backend
      
      // Update Dexie profile with new role
      const profile = await dbOperations.getById('profiles', userId);
      if (profile) {
        await dbOperations.update('profiles', userId, {
          role: newRole,
          updated_at: new Date().toISOString()
        });
      }
      
      // If updating current user's role, reload permissions
      const currentUser = get().user;
      if (currentUser?.id === userId) {
        set({ currentRole: newRole });
        await get().loadPermissions(userId);
      }
      
      return true;
    } catch (error) {
      console.error('❌ [PERMISSIONS] Error updating user role:', error);
      return false;
    }
  },

  clearPermissions: () => {
    set({ permissions: [], permissionsLoading: false, permissionsInitialized: false, currentRole: null });
  },

  // Permission check methods (ROLE-BASED)
  can: (permissionCode) => {
    const { user, permissions, currentRole } = get();
    
    // Super Admin has god-mode access - always return true
    if (user?.id === 'super-admin-sheddy-001' || user?.email === 'Shahidmultaniii' || currentRole === 'Super Admin') {
      return true;
    }
    
    return hasPermission(permissions, permissionCode);
  },

  canAny: (permissionCodes) => {
    const { user, permissions, currentRole } = get();
    
    // Super Admin has god-mode access - always return true
    if (user?.id === 'super-admin-sheddy-001' || user?.email === 'Shahidmultaniii' || currentRole === 'Super Admin') {
      return true;
    }
    
    return hasAnyPermission(permissions, permissionCodes);
  },

  canAll: (permissionCodes) => {
    const { user, permissions, currentRole } = get();
    
    // Super Admin has god-mode access - always return true
    if (user?.id === 'super-admin-sheddy-001' || user?.email === 'Shahidmultaniii' || currentRole === 'Super Admin') {
      return true;
    }
    
    return permissionCodes.every(code => hasPermission(permissions, code));
  },

  canAccessRoute: (route) => {
    const { user, permissions, currentRole } = get();
    
    // Super Admin has god-mode access - always return true
    if (user?.id === 'super-admin-sheddy-001' || user?.email === 'Shahidmultaniii' || currentRole === 'Super Admin') {
      return true;
    }
    
    // Define route to permission mapping
    const routePermissions = {
      '/dashboard': 'DASHBOARD_VIEW',
      '/jobs': 'JOBS_VIEW',
      '/customer': 'CUSTOMER_VIEW',
      '/vendors': 'VENDOR_VIEW',
      '/labour': 'LABOUR_VIEW',
      '/supplier': 'SUPPLIER_VIEW',
      '/inventory': 'INVENTORY_VIEW',
      '/accounts': 'ACCOUNTS_VIEW',
      '/summary': 'SUMMARY_VIEW',
      '/daily-tasks': 'DAILY_TASKS_VIEW',
      '/settings': 'SETTINGS_VIEW',
    };
    
    // Find matching route
    const matchingRoute = Object.keys(routePermissions).find(r => route.startsWith(r));
    if (!matchingRoute) return true; // Allow unknown routes by default
    
    const requiredPermission = routePermissions[matchingRoute];
    return hasPermission(permissions, requiredPermission);
  },

  // === USER MANAGEMENT ACTIONS ===
  fetchUsers: async () => {
    try {
      set({ userManagementLoading: true });
      const data = await dbOperations.getAll('profiles');
      set({ users: data || [], userManagementLoading: false });
    } catch (error) {
      console.error('Error fetching users:', error);
      set({ userManagementLoading: false });
    }
  },

  fetchBranches: async () => {
    try {
      const data = await dbOperations.getAll('branches');
      set({ branches: data || [] });
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  },

  addUser: async (user) => {
    try {
      const data = await dbOperations.insert('profiles', {
        name: user.name,
        email: user.email,
        role: user.role,
        branch_id: user.branch_id || null,
        status: 'Active',
          permissions: user.permissions || {
          dashboard: 'full',
          jobs: 'full',
          customer: 'full',
          vendors: 'full',
          labour: 'full',
          supplier: 'full',
          inventory: 'full',
          accounts: 'full',
          summary: 'full',
          dailyTasks: 'full',
          settings: 'none'
        }
      });

      set((state) => ({ users: [...state.users, data] }));
      toast.success('User added successfully');
      return data;
    } catch (error) {
      console.error('Error adding user:', error);
      toast.error('Failed to add user');
      throw error;
    }
  },

  updateUser: async (updatedUser) => {
    try {
      await dbOperations.update('profiles', updatedUser.id, updatedUser);
      set((state) => ({
        users: state.users.map((u) => u.id === updatedUser.id ? updatedUser : u),
      }));
      toast.success('User updated successfully');
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Failed to update user');
      throw error;
    }
  },

  deleteUser: async (userId) => {
    try {
      await dbOperations.delete('profiles', userId);
      set((state) => ({
        users: state.users.filter((u) => u.id !== userId),
      }));
      toast.success('User deleted successfully');
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
      throw error;
    }
  },

  addBranch: async (branch) => {
    try {
      const data = await dbOperations.insert('branches', branch);
      set((state) => ({ branches: [...state.branches, data] }));
      toast.success('Branch added successfully');
      return data;
    } catch (error) {
      console.error('Error adding branch:', error);
      toast.error('Failed to add branch');
      throw error;
    }
  },

  updateBranch: async (updatedBranch) => {
    try {
      await dbOperations.update('branches', updatedBranch.id, updatedBranch);
      set((state) => ({
        branches: state.branches.map((b) => b.id === updatedBranch.id ? updatedBranch : b),
      }));
      toast.success('Branch updated successfully');
    } catch (error) {
      console.error('Error updating branch:', error);
      toast.error('Failed to update branch');
      throw error;
    }
  },

  deleteBranch: async (branchId) => {
    try {
      await dbOperations.delete('branches', branchId);
      set((state) => ({
        branches: state.branches.filter((b) => b.id !== branchId),
      }));
      toast.success('Branch deleted successfully');
    } catch (error) {
      console.error('Error deleting branch:', error);
      toast.error('Failed to delete branch');
      throw error;
    }
  },

  // === PREVIEW MODE ACTIONS ===
  startPreview: async (userId, userName) => {
    try {
      // Save original permissions
      const currentPermissions = [...get().permissions];
      
      // Load preview user's permissions
      const previewPerms = await getUserPermissions(userId);
      
      // Update permissions with preview user's permissions
      set({
        isPreviewMode: true,
        originalPermissions: currentPermissions,
        previewUser: { id: userId, name: userName },
        permissions: previewPerms
      });
      
      return true;
    } catch (error) {
      console.error('Error starting preview:', error);
      return false;
    }
  },

  endPreview: () => {
    const { originalPermissions } = get();
    
    // Restore original permissions
    set({
      isPreviewMode: false,
      originalPermissions: [],
      previewUser: null,
      permissions: originalPermissions
    });
  },
}),
{
  name: 'malwa-auth-storage',
  partialize: (state) => ({
    isAuthenticated: state.isAuthenticated,
    user: state.user,
    profile: state.profile,
    permissions: state.permissions,
    permissionsInitialized: state.permissionsInitialized,
    currentRole: state.currentRole,
  }),
}
));

// Legacy exports for backward compatibility
export const useAuthStore = () => {
  const store = useAuthManagementStore();
  return {
    isAuthenticated: store.isAuthenticated,
    user: store.user,
    profile: store.profile,
    loading: store.authLoading,
    initialize: store.initialize,
    login: store.login,
    logout: store.logout,
    updateProfile: store.updateProfile,
    setAuthentication: store.setAuthentication
  };
};

export const usePermissionStore = () => {
  const store = useAuthManagementStore();
  return {
    permissions: store.permissions,
    loading: store.permissionsLoading,
    initialized: store.permissionsInitialized,
    loadPermissions: store.loadPermissions,
    updatePermissions: store.updatePermissions,
    clearPermissions: store.clearPermissions,
    can: store.can,
    canAny: store.canAny,
    canAll: store.canAll,
    canAccessRoute: store.canAccessRoute
  };
};

export const useUserManagementStore = () => {
  const store = useAuthManagementStore();
  return {
    users: store.users,
    branches: store.branches,
    loading: store.userManagementLoading,
    fetchUsers: store.fetchUsers,
    fetchBranches: store.fetchBranches,
    addUser: store.addUser,
    updateUser: store.updateUser,
    deleteUser: store.deleteUser,
    addBranch: store.addBranch,
    updateBranch: store.updateBranch,
    deleteBranch: store.deleteBranch
  };
};

export const usePreviewStore = () => {
  const store = useAuthManagementStore();
  return {
    isPreviewMode: store.isPreviewMode,
    originalPermissions: store.originalPermissions,
    previewUser: store.previewUser,
    startPreview: store.startPreview,
    endPreview: store.endPreview
  };
};

export default useAuthManagementStore;