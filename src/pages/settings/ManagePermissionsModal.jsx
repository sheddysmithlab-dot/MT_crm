import { useState, useEffect } from 'react';
import { Shield, Users, Lock, Unlock, Save, Plus, Trash2, Edit2, Check, X, Eye, FileText, Package, Building2, Wrench, UserCog, DollarSign, BarChart3, Settings2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { toast } from 'sonner';
import { dbOperations } from '@/lib/db';
import { useAuthStore } from '@/store/authManagementStore';

const MODULES = [
  { id: 'dashboard', name: 'Dashboard', icon: BarChart3, color: 'blue' },
  { id: 'jobs', name: 'Jobs Module', icon: Wrench, color: 'orange' },
  { id: 'customer', name: 'Customer Module', icon: Users, color: 'green' },
  { id: 'vendors', name: 'Vendors Module', icon: Building2, color: 'purple' },
  { id: 'labour', name: 'Employee Module', icon: UserCog, color: 'yellow' },
  { id: 'supplier', name: 'Supplier Module', icon: Package, color: 'indigo' },
  { id: 'inventory', name: 'Inventory Module', icon: FileText, color: 'teal' },
  { id: 'accounts', name: 'Accounts Module', icon: DollarSign, color: 'emerald' },
  { id: 'summary', name: 'Summary Module', icon: BarChart3, color: 'pink' },
  { id: 'settings', name: 'Settings Module', icon: Settings2, color: 'gray' },
];

const ACTIONS = ['VIEW', 'CREATE', 'EDIT', 'DELETE'];

const ManagePermissionsModal = ({ isOpen, onClose }) => {
  const { user: currentUser, profile: currentProfile } = useAuthStore();
  const [roles, setRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(false);
  const [isAddingRole, setIsAddingRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [editingRoleId, setEditingRoleId] = useState(null);
  const [editingRoleName, setEditingRoleName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterModule, setFilterModule] = useState('all');
  const [showStats, setShowStats] = useState(true);

  // Check if current user can manage permissions
  const canManagePermissions = currentProfile?.role === 'Super Admin' || 
                               currentProfile?.role === 'Admin' ||
                               currentUser?.id === 'super-admin-sheddy-001';

  useEffect(() => {
    if (isOpen) {
      if (!canManagePermissions) {
        toast.error('You do not have permission to manage permissions');
        onClose();
        return;
      }
      loadRoles();
    }
  }, [isOpen, canManagePermissions]);

  const loadRoles = async () => {
    try {
      setLoading(true);
      let rolesData = await dbOperations.getAll('roles') || [];
      const permissionsData = await dbOperations.getAll('permissions') || [];
      
      // Initialize default roles if none exist
      if (rolesData.length === 0) {
        const defaultRoles = [
          { id: 'role_super_admin', name: 'Super Admin', createdAt: new Date().toISOString(), status: 'active' },
          { id: 'role_admin', name: 'Admin', createdAt: new Date().toISOString(), status: 'active' },
          { id: 'role_accountant', name: 'Accountant', createdAt: new Date().toISOString(), status: 'active' },
          { id: 'role_manager', name: 'Manager', createdAt: new Date().toISOString(), status: 'active' },
          { id: 'role_user', name: 'User', createdAt: new Date().toISOString(), status: 'active' },
        ];
        
        for (const role of defaultRoles) {
          await dbOperations.insert('roles', role);
        }
        
        rolesData = defaultRoles;
        
        // Save to backend
        if (window.electron?.fs?.writeFile) {
          await window.electron.fs.writeFile(
            'C:/malwa-crm/Data_base/Settings_Module/roles.json',
            JSON.stringify(rolesData, null, 2)
          );
        }
        
        toast.success('Default roles initialized');
      }
      
      setRoles(rolesData);
      
      // Organize permissions by role
      const permMap = {};
      permissionsData.forEach(perm => {
        if (!permMap[perm.roleId]) {
          permMap[perm.roleId] = {};
        }
        if (!permMap[perm.roleId][perm.resource]) {
          permMap[perm.roleId][perm.resource] = [];
        }
        permMap[perm.roleId][perm.resource].push(perm.action);
      });
      
      setPermissions(permMap);
      
      if (rolesData.length > 0 && !selectedRole) {
        setSelectedRole(rolesData[0]);
      }
    } catch (error) {
      console.error('Error loading roles:', error);
      toast.error('Failed to load roles');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRole = async () => {
    if (!newRoleName.trim()) {
      toast.error('Please enter a role name');
      return;
    }

    try {
      const roleData = {
        id: `role_${Date.now()}`,
        name: newRoleName,
        createdAt: new Date().toISOString(),
        status: 'active'
      };

      await dbOperations.insert('roles', roleData);
      
      // Save to backend
      if (window.electron?.fs?.writeFile) {
        const allRoles = await dbOperations.getAll('roles');
        await window.electron.fs.writeFile(
          'C:/malwa-crm/Data_base/Settings_Module/roles.json',
          JSON.stringify(allRoles, null, 2)
        );
      }
      
      toast.success('Role created successfully');
      setNewRoleName('');
      setIsAddingRole(false);
      loadRoles();
    } catch (error) {
      console.error('Error creating role:', error);
      toast.error('Failed to create role');
    }
  };

  const handleDeleteRole = async (roleId) => {
    const roleToDelete = roles.find(r => r.id === roleId);
    
    // Prevent deletion of critical roles
    if (['Super Admin', 'Admin'].includes(roleToDelete?.name)) {
      toast.error('Cannot delete system roles (Super Admin, Admin)');
      return;
    }

    if (!confirm(`Are you sure you want to delete the role "${roleToDelete?.name}"? This action cannot be undone.`)) return;

    try {
      setLoading(true);
      
      // Check if any users are assigned to this role
      const allProfiles = await dbOperations.getAll('profiles');
      const usersWithRole = allProfiles.filter(p => p.role === roleToDelete.name);
      
      if (usersWithRole.length > 0) {
        toast.error(`Cannot delete role. ${usersWithRole.length} user(s) are assigned to this role.`);
        setLoading(false);
        return;
      }

      await dbOperations.delete('roles', roleId);
      
      // Delete associated permissions
      const allPermissions = await dbOperations.getAll('permissions');
      const rolePermissions = allPermissions.filter(p => p.roleId === roleId);
      for (const perm of rolePermissions) {
        await dbOperations.delete('permissions', perm.id);
      }
      
      // Save to backend
      if (window.electron?.fs?.writeFile) {
        const [updatedRoles, updatedPermissions] = await Promise.all([
          dbOperations.getAll('roles'),
          dbOperations.getAll('permissions')
        ]);
        
        await Promise.all([
          window.electron.fs.writeFile(
            'C:/malwa-crm/Data_base/Settings_Module/roles.json',
            JSON.stringify(updatedRoles, null, 2)
          ),
          window.electron.fs.writeFile(
            'C:/malwa-crm/Data_base/Settings_Module/permissions.json',
            JSON.stringify(updatedPermissions, null, 2)
          )
        ]);
      }
      
      toast.success(`Role "${roleToDelete.name}" deleted successfully`);
      setSelectedRole(null);
      loadRoles();
    } catch (error) {
      console.error('Error deleting role:', error);
      toast.error('Failed to delete role');
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePermission = async (moduleId, action) => {
    if (!selectedRole) return;

    try {
      const roleId = selectedRole.id;
      const currentPerms = permissions[roleId]?.[moduleId] || [];
      const hasPermission = currentPerms.includes(action);

      if (hasPermission) {
        // Remove permission
        const allPermissions = await dbOperations.getAll('permissions');
        const permToDelete = allPermissions.find(
          p => p.roleId === roleId && p.resource === moduleId && p.action === action
        );
        
        if (permToDelete) {
          await dbOperations.delete('permissions', permToDelete.id);
        }
      } else {
        // Add permission
        const permData = {
          id: `perm_${Date.now()}_${Math.random()}`,
          roleId: roleId,
          resource: moduleId,
          action: action,
          createdAt: new Date().toISOString()
        };
        
        await dbOperations.insert('permissions', permData);
      }
      
      // Save to backend
      if (window.electron?.fs?.writeFile) {
        const allPermissions = await dbOperations.getAll('permissions');
        await window.electron.fs.writeFile(
          'C:/malwa-crm/Data_base/Settings_Module/permissions.json',
          JSON.stringify(allPermissions, null, 2)
        );
      }
      
      loadRoles();
    } catch (error) {
      console.error('Error toggling permission:', error);
      toast.error('Failed to update permission');
    }
  };

  const handleSelectAllModule = async (moduleId) => {
    if (!selectedRole) return;

    try {
      const roleId = selectedRole.id;
      const currentPerms = permissions[roleId]?.[moduleId] || [];
      const allSelected = ACTIONS.every(action => currentPerms.includes(action));

      if (allSelected) {
        // Remove all permissions for this module
        const allPermissions = await dbOperations.getAll('permissions');
        const permsToDelete = allPermissions.filter(
          p => p.roleId === roleId && p.resource === moduleId
        );
        
        for (const perm of permsToDelete) {
          await dbOperations.delete('permissions', perm.id);
        }
      } else {
        // Add all permissions for this module
        const allPermissions = await dbOperations.getAll('permissions');
        
        for (const action of ACTIONS) {
          const exists = allPermissions.find(
            p => p.roleId === roleId && p.resource === moduleId && p.action === action
          );
          
          if (!exists) {
            const permData = {
              id: `perm_${Date.now()}_${action}_${Math.random()}`,
              roleId: roleId,
              resource: moduleId,
              action: action,
              createdAt: new Date().toISOString()
            };
            
            await dbOperations.insert('permissions', permData);
          }
        }
      }
      
      // Save to backend
      if (window.electron?.fs?.writeFile) {
        const allPermissions = await dbOperations.getAll('permissions');
        await window.electron.fs.writeFile(
          'C:/malwa-crm/Data_base/Settings_Module/permissions.json',
          JSON.stringify(allPermissions, null, 2)
        );
      }
      
      loadRoles();
      toast.success(`Module permissions updated for ${selectedRole.name}`);
    } catch (error) {
      console.error('Error selecting all permissions:', error);
      toast.error('Failed to update permissions');
    }
  };

  const handleEditRole = async (roleId, newName) => {
    if (!newName.trim()) {
      toast.error('Role name cannot be empty');
      return;
    }

    const roleToEdit = roles.find(r => r.id === roleId);
    
    // Prevent editing system roles
    if (['Super Admin', 'Admin'].includes(roleToEdit?.name)) {
      toast.error('Cannot rename system roles (Super Admin, Admin)');
      setEditingRoleId(null);
      setEditingRoleName('');
      return;
    }

    try {
      const updatedRole = {
        ...roleToEdit,
        name: newName,
        updatedAt: new Date().toISOString()
      };

      await dbOperations.update('roles', roleId, updatedRole);
      
      // Update all users with this role
      const allProfiles = await dbOperations.getAll('profiles');
      const usersWithRole = allProfiles.filter(p => p.role === roleToEdit.name);
      
      for (const profile of usersWithRole) {
        await dbOperations.update('profiles', profile.id, {
          ...profile,
          role: newName,
          updatedAt: new Date().toISOString()
        });
      }
      
      // Save to backend
      if (window.electron?.fs?.writeFile) {
        const [updatedRoles, updatedProfiles] = await Promise.all([
          dbOperations.getAll('roles'),
          dbOperations.getAll('profiles')
        ]);
        
        await Promise.all([
          window.electron.fs.writeFile(
            'C:/malwa-crm/Data_base/Settings_Module/roles.json',
            JSON.stringify(updatedRoles, null, 2)
          ),
          window.electron.fs.writeFile(
            'C:/malwa-crm/Data_base/Settings_Module/profiles.json',
            JSON.stringify(updatedProfiles, null, 2)
          )
        ]);
      }
      
      toast.success(`Role renamed to "${newName}"`);
      setEditingRoleId(null);
      setEditingRoleName('');
      loadRoles();
    } catch (error) {
      console.error('Error editing role:', error);
      toast.error('Failed to rename role');
    }
  };

  const handleDuplicateRole = async (roleId) => {
    try {
      const roleToDuplicate = roles.find(r => r.id === roleId);
      if (!roleToDuplicate) return;

      const newRoleName = `${roleToDuplicate.name} (Copy)`;
      const newRoleId = `role_${Date.now()}`;

      const newRole = {
        id: newRoleId,
        name: newRoleName,
        createdAt: new Date().toISOString(),
        status: 'active'
      };

      await dbOperations.insert('roles', newRole);

      // Copy all permissions
      const allPermissions = await dbOperations.getAll('permissions');
      const rolePermissions = allPermissions.filter(p => p.roleId === roleId);
      
      for (const perm of rolePermissions) {
        const newPerm = {
          id: `perm_${Date.now()}_${Math.random()}`,
          roleId: newRoleId,
          resource: perm.resource,
          action: perm.action,
          createdAt: new Date().toISOString()
        };
        await dbOperations.insert('permissions', newPerm);
      }

      // Save to backend
      if (window.electron?.fs?.writeFile) {
        const [updatedRoles, updatedPermissions] = await Promise.all([
          dbOperations.getAll('roles'),
          dbOperations.getAll('permissions')
        ]);
        
        await Promise.all([
          window.electron.fs.writeFile(
            'C:/malwa-crm/Data_base/Settings_Module/roles.json',
            JSON.stringify(updatedRoles, null, 2)
          ),
          window.electron.fs.writeFile(
            'C:/malwa-crm/Data_base/Settings_Module/permissions.json',
            JSON.stringify(updatedPermissions, null, 2)
          )
        ]);
      }

      toast.success(`Role duplicated as "${newRoleName}"`);
      loadRoles();
    } catch (error) {
      console.error('Error duplicating role:', error);
      toast.error('Failed to duplicate role');
    }
  };

  // Calculate permission statistics
  const getPermissionStats = (roleId) => {
    const rolePerms = permissions[roleId] || {};
    const totalModules = MODULES.length;
    const totalPossiblePerms = totalModules * ACTIONS.length;
    
    let grantedPerms = 0;
    Object.values(rolePerms).forEach(actions => {
      grantedPerms += actions.length;
    });

    const modulesWithAccess = Object.keys(rolePerms).length;
    const percentageGranted = Math.round((grantedPerms / totalPossiblePerms) * 100);

    return {
      grantedPerms,
      totalPossiblePerms,
      modulesWithAccess,
      totalModules,
      percentageGranted
    };
  };

  // Filter modules based on search and filter
  const filteredModules = MODULES.filter(module => {
    const matchesSearch = module.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterModule === 'all' || module.id === filterModule;
    return matchesSearch && matchesFilter;
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Manage Permissions & Roles" size="3xl">
      <div className="flex h-[700px] gap-4">
        {/* Left Sidebar - Roles */}
        <div className="w-[30%] border-r border-gray-200 dark:border-gray-700 pr-4 flex flex-col">
          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-lg text-gray-800 dark:text-gray-200 flex items-center gap-2">
                <Shield className="w-5 h-5 text-purple-600" />
                Roles
              </h3>
              <Button
                size="sm"
                onClick={() => setIsAddingRole(true)}
                className="bg-green-600 hover:bg-green-700 text-white"
                disabled={!canManagePermissions}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            
            {isAddingRole && (
              <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-green-500">
                <input
                  type="text"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="Enter role name..."
                  className="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded mb-2 dark:bg-gray-700 dark:text-dark-text focus:ring-2 focus:ring-green-500"
                  autoFocus
                  onKeyPress={(e) => e.key === 'Enter' && handleCreateRole()}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleCreateRole} className="bg-green-600 hover:bg-green-700 text-white flex-1">
                    <Check className="w-3 h-3 mr-1" /> Save
                  </Button>
                  <Button size="sm" onClick={() => { setIsAddingRole(false); setNewRoleName(''); }} className="bg-gray-500 hover:bg-gray-600 text-white flex-1">
                    <X className="w-3 h-3 mr-1" /> Cancel
                  </Button>
                </div>
              </div>
            )}

            <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              {roles.length} Role{roles.length !== 1 ? 's' : ''} • Click to configure
            </div>
          </div>
          
          <div className="space-y-2 overflow-y-auto flex-1 pr-2 custom-scrollbar">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              </div>
            ) : roles.length === 0 ? (
              <div className="text-center py-8">
                <Shield className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p className="text-sm text-gray-500">No roles found</p>
                <p className="text-xs text-gray-400 mt-1">Click + to create one</p>
              </div>
            ) : (
              roles.map((role) => {
                const stats = getPermissionStats(role.id);
                const isSystemRole = ['Super Admin', 'Admin'].includes(role.name);
                
                return (
                  <div
                    key={role.id}
                    className={`p-3 rounded-lg transition-all border-2 ${
                      selectedRole?.id === role.id
                        ? 'bg-purple-50 dark:bg-purple-900/30 border-purple-500 shadow-md'
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600 hover:shadow'
                    }`}
                  >
                    {editingRoleId === role.id ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={editingRoleName}
                          onChange={(e) => setEditingRoleName(e.target.value)}
                          className="w-full p-1.5 text-sm border border-purple-300 dark:border-purple-600 rounded dark:bg-gray-700 dark:text-dark-text focus:ring-2 focus:ring-purple-500"
                          autoFocus
                          onKeyPress={(e) => e.key === 'Enter' && handleEditRole(role.id, editingRoleName)}
                        />
                        <div className="flex gap-1">
                          <Button size="sm" onClick={() => handleEditRole(role.id, editingRoleName)} className="bg-green-600 hover:bg-green-700 text-white flex-1 text-xs py-1">
                            <Check className="w-3 h-3" />
                          </Button>
                          <Button size="sm" onClick={() => { setEditingRoleId(null); setEditingRoleName(''); }} className="bg-gray-500 hover:bg-gray-600 text-white flex-1 text-xs py-1">
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between mb-2" onClick={() => setSelectedRole(role)}>
                          <div className="flex items-start gap-2 flex-1 cursor-pointer">
                            <Shield className={`w-4 h-4 mt-0.5 ${isSystemRole ? 'text-yellow-500' : 'text-purple-600'}`} />
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-sm dark:text-dark-text truncate">{role.name}</div>
                              {isSystemRole && (
                                <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 rounded">
                                  System Role
                                </span>
                              )}
                            </div>
                          </div>
                          
                          {!isSystemRole && canManagePermissions && (
                            <div className="flex gap-1 ml-2" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => {
                                  setEditingRoleId(role.id);
                                  setEditingRoleName(role.name);
                                }}
                                className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded transition-colors"
                                title="Rename role"
                              >
                                <Edit2 className="w-3 h-3 text-blue-600" />
                              </button>
                              <button
                                onClick={() => handleDuplicateRole(role.id)}
                                className="p-1 hover:bg-green-100 dark:hover:bg-green-900/30 rounded transition-colors"
                                title="Duplicate role"
                              >
                                <Plus className="w-3 h-3 text-green-600" />
                              </button>
                              <button
                                onClick={() => handleDeleteRole(role.id)}
                                className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                                title="Delete role"
                              >
                                <Trash2 className="w-3 h-3 text-red-600" />
                              </button>
                            </div>
                          )}
                        </div>
                        
                        {/* Permission Stats */}
                        <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-gray-600 dark:text-gray-400">Permissions</span>
                            <span className="font-semibold text-purple-600 dark:text-purple-400">
                              {stats.percentageGranted}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                            <div 
                              className="bg-gradient-to-r from-purple-500 to-pink-500 h-1.5 rounded-full transition-all"
                              style={{ width: `${stats.percentageGranted}%` }}
                            ></div>
                          </div>
                          <div className="flex items-center justify-between mt-1 text-xs text-gray-500 dark:text-gray-400">
                            <span>{stats.grantedPerms} granted</span>
                            <span>{stats.modulesWithAccess}/{stats.totalModules} modules</span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Panel - Permissions Matrix */}
        <div className="w-[70%] flex flex-col overflow-hidden">
          {selectedRole ? (
            <>
              {/* Header with Role Info and Controls */}
              <div className="mb-4 p-4 bg-gradient-to-r from-purple-100 via-pink-100 to-blue-100 dark:from-purple-900/30 dark:via-pink-900/30 dark:to-blue-900/30 rounded-lg border border-purple-200 dark:border-purple-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                      <Shield className="w-8 h-8 text-purple-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-purple-900 dark:text-purple-300">{selectedRole.name}</h2>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Configure access permissions</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowStats(!showStats)}
                      className="px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-purple-300 dark:border-purple-600 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                    >
                      {showStats ? <Eye className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                
                {/* Stats Overview */}
                {showStats && (
                  <div className="mt-4 grid grid-cols-4 gap-3">
                    {(() => {
                      const stats = getPermissionStats(selectedRole.id);
                      return (
                        <>
                          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm">
                            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total Permissions</div>
                            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.grantedPerms}</div>
                          </div>
                          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm">
                            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Module Access</div>
                            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.modulesWithAccess}/{stats.totalModules}</div>
                          </div>
                          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm">
                            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Coverage</div>
                            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.percentageGranted}%</div>
                          </div>
                          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm">
                            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Status</div>
                            <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" />
                              {selectedRole.status || 'Active'}
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Search and Filter */}
              <div className="mb-4 flex gap-3">
                <input
                  type="text"
                  placeholder="Search modules..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-dark-text focus:ring-2 focus:ring-purple-500"
                />
                <select
                  value={filterModule}
                  onChange={(e) => setFilterModule(e.target.value)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-dark-text focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">All Modules</option>
                  {MODULES.map(module => (
                    <option key={module.id} value={module.id}>{module.name}</option>
                  ))}
                </select>
              </div>

              {/* Permissions Grid */}
              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                <div className="space-y-3">
                  {filteredModules.map((module) => {
                    const IconComponent = module.icon;
                    const modulePerms = permissions[selectedRole.id]?.[module.id] || [];
                    const allSelected = ACTIONS.every(action => modulePerms.includes(action));
                    const someSelected = ACTIONS.some(action => modulePerms.includes(action));
                    
                    return (
                      <Card key={module.id} className="p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 bg-${module.color}-100 dark:bg-${module.color}-900/30 rounded-lg`}>
                              <IconComponent className={`w-5 h-5 text-${module.color}-600 dark:text-${module.color}-400`} />
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-800 dark:text-gray-200">{module.name}</h3>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {modulePerms.length} / {ACTIONS.length} permissions granted
                              </p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleSelectAllModule(module.id)}
                            disabled={!canManagePermissions}
                            className={`${
                              allSelected
                                ? 'bg-red-500 hover:bg-red-600 text-white'
                                : someSelected
                                ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                                : 'bg-green-500 hover:bg-green-600 text-white'
                            }`}
                          >
                            {allSelected ? (
                              <><Lock className="w-3 h-3 mr-1" /> Revoke All</>
                            ) : someSelected ? (
                              <><AlertCircle className="w-3 h-3 mr-1" /> Grant All</>
                            ) : (
                              <><Unlock className="w-3 h-3 mr-1" /> Grant All</>
                            )}
                          </Button>
                        </div>
                        
                        <div className="grid grid-cols-4 gap-2">
                          {ACTIONS.map((action) => {
                            const hasPermission = modulePerms.includes(action);
                            
                            return (
                              <button
                                key={action}
                                onClick={() => handleTogglePermission(module.id, action)}
                                disabled={!canManagePermissions}
                                className={`p-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1 ${
                                  hasPermission
                                    ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-md hover:shadow-lg transform hover:scale-105'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                                } ${!canManagePermissions ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                              >
                                {hasPermission ? (
                                  <CheckCircle2 className="w-4 h-4" />
                                ) : (
                                  <XCircle className="w-4 h-4" />
                                )}
                                {action}
                              </button>
                            );
                          })}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="p-6 bg-gray-100 dark:bg-gray-800 rounded-full inline-block mb-4">
                  <Shield className="w-16 h-16 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">No Role Selected</h3>
                <p className="text-gray-500 dark:text-gray-400">Select a role from the left to manage its permissions</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Custom Scrollbar Styles */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(156, 163, 175, 0.5);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(156, 163, 175, 0.7);
        }
      `}} />
    </Modal>
  );
};

export default ManagePermissionsModal;
