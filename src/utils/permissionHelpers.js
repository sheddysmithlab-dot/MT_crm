import cachedDb from '@/utils/cachedDbOperations';
const dbOperations = cachedDb;
import { PERMISSION_CATALOG, ROLE_PRESETS } from './permissionCatalog';

// ===== ROLE-BASED PERMISSION SYSTEM =====
// Load roles from file system
let rolesCache = null;
let rolesCacheTime = 0;
const CACHE_TTL = 60000; // 1 minute

const loadRolesFromFile = async () => {
  // Check cache first
  if (rolesCache && (Date.now() - rolesCacheTime) < CACHE_TTL) {
    return rolesCache;
  }

  try {
    const rolesPath = 'C:/malwa-crm/Data_base/settings/User_Management/roles.json';
    
    if (window.electron?.cache?.readFile) {
      const rolesData = await window.electron.cache.readFile(rolesPath);
      rolesCache = JSON.parse(rolesData);
      rolesCacheTime = Date.now();
      return rolesCache;
    }
    
    // Fallback to default role presets if file system unavailable
    console.warn('⚠️ [PERMISSIONS] File system unavailable, using default role presets');
    return null;
  } catch (error) {
    console.error('❌ [PERMISSIONS] Error loading roles.json:', error);
    return null;
  }
};

// Permission Check Functions (ROLE-BASED)
export const hasPermission = (userPermissions, permissionCode) => {
  if (!userPermissions || !Array.isArray(userPermissions)) return false;
  
  // Check for super admin wildcard permission
  if (userPermissions.includes('*')) return true;
  
  return userPermissions.includes(permissionCode);
};

export const hasAnyPermission = (userPermissions, permissionCodes) => {
  if (!userPermissions || !Array.isArray(userPermissions)) return false;
  
  // Check for super admin wildcard permission
  if (userPermissions.includes('*')) return true;
  
  return permissionCodes.some(code => userPermissions.includes(code));
};

export const hasAllPermissions = (userPermissions, permissionCodes) => {
  if (!userPermissions || !Array.isArray(userPermissions)) return false;
  
  // Check for super admin wildcard permission
  if (userPermissions.includes('*')) return true;
  
  return permissionCodes.every(code => userPermissions.includes(code));
};

// NEW: Check permission by role
export const checkPermissionByRole = async (role, module, page, action) => {
  if (!role) {
    console.warn('⚠️ [PERMISSIONS] No role provided');
    return false;
  }
  
  // Super Admin has god mode
  if (role === 'Super Admin') return true;
  
  const roles = await loadRolesFromFile();
  if (!roles || !roles[role]) {
    console.warn('⚠️ [PERMISSIONS] Role not found:', role);
    return false;
  }
  
  const roleConfig = roles[role];
  
  // Check for god mode
  if (roleConfig.permissions?.godMode) return true;
  
  // Check module -> page -> action
  const modulePerms = roleConfig.permissions?.modules?.[module];
  if (!modulePerms) return false;
  
  const pagePerms = modulePerms.pages?.[page];
  if (!pagePerms) return false;
  
  return pagePerms[action] === true;
};

// NEW: Check if role has access to a page
export const hasPageAccess = async (role, module, page) => {
  return await checkPermissionByRole(role, module, page, 'view');
};

// NEW: Get all permissions for a role
export const getPermissionsByRole = async (role) => {
  if (!role) {
    console.warn('⚠️ [PERMISSIONS] No role provided');
    return [];
  }
  
  // Super Admin has all permissions
  if (role === 'Super Admin') {
    return ['*'];
  }
  
  const roles = await loadRolesFromFile();
  if (!roles || !roles[role]) {
    console.warn('⚠️ [PERMISSIONS] Role not found:', role);
    return [];
  }
  
  const roleConfig = roles[role];
  
  // If god mode, return wildcard
  if (roleConfig.permissions?.godMode) {
    return ['*'];
  }
  
  // Convert role matrix to permission codes
  const permissions = [];
  const modules = roleConfig.permissions?.modules || {};
  
  Object.entries(modules).forEach(([moduleName, moduleConfig]) => {
    const pages = moduleConfig.pages || {};
    Object.entries(pages).forEach(([pageName, actions]) => {
      if (actions.view) permissions.push(`${moduleName.toUpperCase()}_VIEW`);
      if (actions.create) permissions.push(`${moduleName.toUpperCase()}_CREATE`);
      if (actions.edit) permissions.push(`${moduleName.toUpperCase()}_EDIT`);
      if (actions.delete) permissions.push(`${moduleName.toUpperCase()}_DELETE`);
      if (actions.export) permissions.push(`${moduleName.toUpperCase()}_EXPORT`);
    });
  });
  
  return [...new Set(permissions)]; // Remove duplicates
};

// Get user permissions from database (ROLE-BASED)
export const getUserPermissions = async (userId) => {
  try {
    console.log('🔍 [PERMISSIONS] Getting permissions for userId:', userId);
    
    const profile = await dbOperations.getById('profiles', userId);
    console.log('📋 [PERMISSIONS] Profile found:', {
      id: profile?.id,
      name: profile?.name,
      role: profile?.role
    });
    
    if (!profile) {
      console.warn('⚠️ [PERMISSIONS] No profile found for userId:', userId);
      return [];
    }
    
    // CRITICAL: Check if role exists, if not default to Employee
    if (!profile.role) {
      console.warn('⚠️ [PERMISSIONS] Profile missing role field, using Employee as default');
      profile.role = 'Employee';
      
      // Update profile with default role
      try {
        await dbOperations.update('profiles', userId, {
          role: 'Employee',
          updated_at: new Date().toISOString()
        });
        console.log('✅ [PERMISSIONS] Updated profile with default Employee role');
      } catch (updateError) {
        console.warn('⚠️ [PERMISSIONS] Failed to update profile with default role:', updateError);
      }
    }
    
    // ROLE-BASED: Get permissions from role
    console.log('📌 [PERMISSIONS] Using role-based permissions for role:', profile.role);
    const rolePermissions = await getPermissionsByRole(profile.role);
    console.log('✅ [PERMISSIONS] Role permissions loaded:', rolePermissions.length, 'permissions');
    
    return rolePermissions;
  } catch (error) {
    console.error('❌ [PERMISSIONS] Error getting user permissions:', {
      userId,
      error: error.message,
      stack: error.stack
    });
    return [];
  }
};

// DEPRECATED: Get permissions based on role from legacy ROLE_PRESETS (fallback only)
export const getRolePermissions = (role) => {
  console.log('🔍 [PERMISSIONS] Getting role permissions for:', role);
  
  // Handle undefined/null role
  if (!role) {
    console.warn('⚠️ [PERMISSIONS] No role provided, defaulting to Employee');
    role = 'Employee';
  }
  
  const preset = ROLE_PRESETS[role];
  
  if (!preset) {
    console.warn('⚠️ [PERMISSIONS] Role preset not found:', role, 'Available roles:', Object.keys(ROLE_PRESETS));
    console.warn('⚠️ [PERMISSIONS] Defaulting to Employee permissions');
    return ROLE_PRESETS['Employee']?.permissions || [];
  }
  
  console.log('✅ [PERMISSIONS] Found preset for role:', role, '- Permissions count:', preset.permissions.length);
  return preset.permissions;
};

// Save user permissions to database (DEPRECATED - use role assignment instead)
export const saveUserPermissions = async (userId, permissions, actorId = null) => {
  console.warn('⚠️ [PERMISSIONS] saveUserPermissions is deprecated. Use role assignment instead.');
  try {
    const profile = await dbOperations.getById('profiles', userId);
    if (!profile) {
      throw new Error('User profile not found');
    }
    
    // Don't save per-user permissions anymore, just log the action
    console.log('ℹ️ [PERMISSIONS] Per-user permissions are disabled. Please assign a role instead.');
    
    // Log the permission change attempt
    if (actorId) {
      await logPermissionChange(userId, actorId, permissions);
    }
    
    return true;
  } catch (error) {
    console.error('Error saving user permissions:', error);
    return false;
  }
};

// Apply role to user (NEW: primary method for permission management)
export const applyRoleToUser = async (userId, role, actorId = null) => {
  try {
    const profile = await dbOperations.getById('profiles', userId);
    if (!profile) {
      throw new Error('User profile not found');
    }
    
    // Update user's role
    await dbOperations.update('profiles', userId, {
      role: role,
      updated_at: new Date().toISOString()
    });
    
    // Log the role change
    if (actorId) {
      await logRoleChange(userId, actorId, role);
    }
    
    console.log('✅ [PERMISSIONS] Role applied:', { userId, role });
    return true;
  } catch (error) {
    console.error('❌ [PERMISSIONS] Error applying role:', error);
    return false;
  }
};

// Apply role preset to user (DEPRECATED - use applyRoleToUser)
export const applyRolePreset = async (userId, role, actorId = null) => {
  console.warn('⚠️ [PERMISSIONS] applyRolePreset is deprecated. Use applyRoleToUser instead.');
  return await applyRoleToUser(userId, role, actorId);
};

// Copy permissions from one user to another (DEPRECATED - not supported in role-based system)
export const copyUserPermissions = async (fromUserId, toUserId, actorId = null) => {
  console.warn('⚠️ [PERMISSIONS] copyUserPermissions is deprecated and not supported in role-based system.');
  try {
    // Get source user's role
    const fromProfile = await dbOperations.getById('profiles', fromUserId);
    if (!fromProfile || !fromProfile.role) {
      throw new Error('Source user role not found');
    }
    
    // Apply same role to target user
    return await applyRoleToUser(toUserId, fromProfile.role, actorId);
  } catch (error) {
    console.error('Error copying user role:', error);
    return false;
  }
};

// Log role changes to audit log
const logRoleChange = async (userId, actorId, newRole) => {
  try {
    const user = await dbOperations.getById('profiles', userId);
    const actor = await dbOperations.getById('profiles', actorId);
    
    await dbOperations.insert('audit_logs', {
      userId: actorId,
      actionType: 'ROLE_CHANGE',
      entityType: 'user_role',
      entityId: userId,
      description: `${actor?.name || 'Admin'} changed role for ${user?.name || 'User'} to ${newRole}`,
      metadata: {
        targetUserId: userId,
        targetUserName: user?.name,
        newRole: newRole,
        oldRole: user?.role
      },
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error logging role change:', error);
  }
};

// Log permission changes to audit log
const logPermissionChange = async (userId, actorId, newPermissions) => {
  try {
    const user = await dbOperations.getById('profiles', userId);
    const actor = await dbOperations.getById('profiles', actorId);
    
    await dbOperations.insert('audit_logs', {
      userId: actorId,
      actionType: 'PERMISSION_CHANGE',
      entityType: 'user_permissions',
      entityId: userId,
      description: `${actor?.name || 'Admin'} updated permissions for ${user?.name || 'User'}`,
      metadata: {
        targetUserId: userId,
        targetUserName: user?.name,
        permissionCount: newPermissions.length,
        permissions: newPermissions,
      },
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error logging permission change:', error);
  }
};

// Get user's accessible routes based on permissions
export const getAccessibleRoutes = (userPermissions) => {
  const routes = [];
  
  // Check dashboard
  if (hasPermission(userPermissions, 'DASHBOARD_VIEW')) {
    routes.push('/dashboard');
  }
  
  // Check jobs module
  if (hasPermission(userPermissions, 'JOBS_VIEW')) {
    routes.push('/jobs');
  }
  
  // Check O&M module
  if (hasPermission(userPermissions, 'OM_VIEW')) {
    routes.push('/om');
  }
  
  // Check customer module
  if (hasPermission(userPermissions, 'CUSTOMER_VIEW')) {
    routes.push('/customer');
  }
  
  // Check vendors module
  if (hasPermission(userPermissions, 'VENDOR_VIEW')) {
    routes.push('/vendors');
  }
  
  // Check labour module
  if (hasPermission(userPermissions, 'LABOUR_VIEW')) {
    routes.push('/labour');
  }
  
  // Check supplier module
  if (hasPermission(userPermissions, 'SUPPLIER_VIEW')) {
    routes.push('/supplier');
  }
  
  // Check inventory module
  if (hasPermission(userPermissions, 'INVENTORY_VIEW')) {
    routes.push('/inventory');
  }
  
  // Check accounts module
  if (hasPermission(userPermissions, 'ACCOUNTS_VIEW')) {
    routes.push('/accounts');
  }
  
  // Check summary module
  if (hasPermission(userPermissions, 'SUMMARY_VIEW')) {
    routes.push('/summary');
  }
  
  // Check daily tasks module
  if (hasPermission(userPermissions, 'DAILY_TASKS_VIEW')) {
    routes.push('/daily-tasks');
  }
  
  // Check settings module
  if (hasPermission(userPermissions, 'SETTINGS_VIEW')) {
    routes.push('/settings');
  }
  
  return routes;
};

// Check if user can access a specific route
export const canAccessRoute = (userPermissions, route) => {
  const accessibleRoutes = getAccessibleRoutes(userPermissions);
  return accessibleRoutes.some(r => route.startsWith(r));
};

// Get permission label from code
export const getPermissionLabel = (permissionCode) => {
  const permission = PERMISSION_CATALOG[permissionCode];
  return permission ? permission.label : permissionCode;
};

// Get permission module from code
export const getPermissionModule = (permissionCode) => {
  const permission = PERMISSION_CATALOG[permissionCode];
  return permission ? permission.module : 'Unknown';
};

// Seed default permissions to database
export const seedPermissions = async () => {
  try {
    // Check if permissions already exist
    const existingCount = await dbOperations.count('permissions');
    if (existingCount > 0) {
      console.log('Permissions already seeded');
      return;
    }
    
    // Insert all permission definitions
    const permissionEntries = Object.values(PERMISSION_CATALOG).map(perm => ({
      id: perm.code,
      code: perm.code,
      label: perm.label,
      module: perm.module,
      createdAt: new Date().toISOString(),
    }));
    
    for (const perm of permissionEntries) {
      await dbOperations.insert('permissions', perm);
    }
    
    console.log(`Seeded ${permissionEntries.length} permissions`);
  } catch (error) {
    console.error('Error seeding permissions:', error);
  }
};

// Seed default roles to database
export const seedRoles = async () => {
  try {
    // Check if roles already exist
    const existingCount = await dbOperations.count('roles');
    if (existingCount > 0) {
      console.log('Roles already seeded');
      return;
    }
    
    // Insert all role presets
    const roleEntries = Object.entries(ROLE_PRESETS).map(([key, preset]) => ({
      id: key.toLowerCase().replace(/\s+/g, '_'),
      name: preset.label,
      description: preset.description,
      permissions: preset.permissions,
      isDefault: true,
      createdAt: new Date().toISOString(),
    }));
    
    for (const role of roleEntries) {
      await dbOperations.insert('roles', role);
    }
    
    console.log(`Seeded ${roleEntries.length} roles`);
  } catch (error) {
    console.error('Error seeding roles:', error);
  }
};

// Initialize permission system
export const initializePermissionSystem = async () => {
  console.log('Initializing permission system...');
  await seedPermissions();
  await seedRoles();
  console.log('Permission system initialized');
};
