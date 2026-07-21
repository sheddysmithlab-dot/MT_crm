import { useState, useEffect } from 'react';
import { Shield, Check, X, Copy, RotateCcw, Save, ChevronDown, ChevronRight } from 'lucide-react';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { toast } from 'sonner';
import { PERMISSION_CATALOG, ROLE_PRESETS, getPermissionsByModule } from '@/utils/permissionCatalog';
import { getUserPermissions, saveUserPermissions, getRolePermissions, copyUserPermissions } from '@/utils/permissionHelpers';
import { dbOperations } from '@/lib/db';

const PermissionMatrix = ({ user, onClose, onSave, currentUserId }) => {
  const [permissions, setPermissions] = useState([]);
  const [originalPermissions, setOriginalPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedModules, setExpandedModules] = useState({});
  const [selectAllModules, setSelectAllModules] = useState({});

  const permissionsByModule = getPermissionsByModule();
  const modules = Object.keys(permissionsByModule);

  useEffect(() => {
    loadUserPermissions();
    // Expand all modules by default
    const expanded = {};
    modules.forEach(module => {
      expanded[module] = true;
    });
    setExpandedModules(expanded);
  }, [user]);

  const loadUserPermissions = async () => {
    setLoading(true);
    try {
      const userPerms = await getUserPermissions(user.id);
      setPermissions(userPerms);
      setOriginalPermissions([...userPerms]);
    } catch (error) {
      console.error('Error loading permissions:', error);
      toast.error('Failed to load permissions');
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = (permissionCode) => {
    setPermissions(prev => {
      if (prev.includes(permissionCode)) {
        return prev.filter(p => p !== permissionCode);
      } else {
        return [...prev, permissionCode];
      }
    });
  };

  const toggleModule = (moduleName) => {
    const modulePermissions = permissionsByModule[moduleName].map(p => p.code);
    const allSelected = modulePermissions.every(code => permissions.includes(code));
    
    if (allSelected) {
      // Deselect all module permissions
      setPermissions(prev => prev.filter(p => !modulePermissions.includes(p)));
    } else {
      // Select all module permissions
      const newPerms = [...new Set([...permissions, ...modulePermissions])];
      setPermissions(newPerms);
    }
  };

  const toggleModuleExpand = (moduleName) => {
    setExpandedModules(prev => ({
      ...prev,
      [moduleName]: !prev[moduleName],
    }));
  };

  const handleApplyRole = async (roleName) => {
    const rolePerms = getRolePermissions(roleName);
    setPermissions(rolePerms);
    toast.success(`Applied ${roleName} role permissions`);
  };

  const handleCopyFrom = async (fromUserId) => {
    try {
      const copiedPerms = await getUserPermissions(fromUserId);
      setPermissions(copiedPerms);
      toast.success('Permissions copied successfully');
    } catch (error) {
      console.error('Error copying permissions:', error);
      toast.error('Failed to copy permissions');
    }
  };

  const handleReset = () => {
    setPermissions([...originalPermissions]);
    toast.info('Permissions reset to original');
  };

  const handleSave = async () => {
    try {
      const success = await saveUserPermissions(user.id, permissions, currentUserId);
      if (success) {
        setOriginalPermissions([...permissions]);
        toast.success('Permissions saved successfully');
        if (onSave) onSave(permissions);
      } else {
        toast.error('Failed to save permissions');
      }
    } catch (error) {
      console.error('Error saving permissions:', error);
      toast.error('Failed to save permissions');
    }
  };

  const hasChanges = () => {
    return JSON.stringify(permissions.sort()) !== JSON.stringify(originalPermissions.sort());
  };

  const getModuleStats = (moduleName) => {
    const modulePermissions = permissionsByModule[moduleName].map(p => p.code);
    const selected = modulePermissions.filter(code => permissions.includes(code)).length;
    const total = modulePermissions.length;
    return { selected, total };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b dark:border-gray-700">
        <div>
          <h3 className="text-lg font-bold dark:text-dark-text flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            Permission Matrix - {user.name}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Manage access permissions for {user.email}
          </p>
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {permissions.length} of {Object.keys(PERMISSION_CATALOG).length} permissions selected
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2 pb-4 border-b dark:border-gray-700">
        <div className="flex gap-2">
          <select
            onChange={(e) => handleApplyRole(e.target.value)}
            value=""
            className="px-3 py-2 text-sm border rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-dark-text"
          >
            <option value="">Apply Role Preset...</option>
            {Object.keys(ROLE_PRESETS).map(role => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>

          <CopyPermissionsButton onCopy={handleCopyFrom} currentUserId={user.id} />
        </div>

        <Button onClick={handleReset} variant="outline" size="sm" disabled={!hasChanges()}>
          <RotateCcw size={16} className="mr-2" />
          Reset
        </Button>
      </div>

      {/* Permission Grid */}
      <div className="max-h-[500px] overflow-y-auto border dark:border-gray-700 rounded-lg">
        {modules.map(moduleName => {
          const stats = getModuleStats(moduleName);
          const isExpanded = expandedModules[moduleName];
          const allSelected = stats.selected === stats.total;
          const someSelected = stats.selected > 0 && stats.selected < stats.total;

          return (
            <div key={moduleName} className="border-b dark:border-gray-700 last:border-b-0">
              {/* Module Header */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-750">
                <button
                  onClick={() => toggleModuleExpand(moduleName)}
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                >
                  {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                </button>

                <button
                  onClick={() => toggleModule(moduleName)}
                  className={`flex items-center justify-center w-5 h-5 border-2 rounded transition-colors ${
                    allSelected
                      ? 'bg-blue-600 border-blue-600'
                      : someSelected
                      ? 'bg-blue-300 border-blue-300'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  {allSelected && <Check size={14} className="text-white" />}
                  {someSelected && !allSelected && <div className="w-2 h-2 bg-white rounded-sm" />}
                </button>

                <div className="flex-1 flex items-center justify-between">
                  <span className="font-semibold text-gray-900 dark:text-dark-text">{moduleName}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {stats.selected}/{stats.total} selected
                  </span>
                </div>
              </div>

              {/* Module Permissions */}
              {isExpanded && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 p-3 bg-white dark:bg-gray-900">
                  {permissionsByModule[moduleName].map(permission => {
                    const isSelected = permissions.includes(permission.code);
                    return (
                      <label
                        key={permission.code}
                        className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer group"
                      >
                        <div
                          onClick={(e) => {
                            e.preventDefault();
                            togglePermission(permission.code);
                          }}
                          className={`flex items-center justify-center w-5 h-5 border-2 rounded transition-colors ${
                            isSelected
                              ? 'bg-green-600 border-green-600'
                              : 'border-gray-300 dark:border-gray-600 group-hover:border-green-400'
                          }`}
                        >
                          {isSelected && <Check size={14} className="text-white" />}
                        </div>
                        <span className="text-sm text-gray-700 dark:text-gray-300">{permission.label}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
        <Button onClick={onClose} variant="outline">
          <X size={18} className="mr-2" />
          Cancel
        </Button>
        <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700" disabled={!hasChanges()}>
          <Save size={18} className="mr-2" />
          Save Permissions
        </Button>
      </div>

      {/* Changes Indicator */}
      {hasChanges() && (
        <div className="text-sm text-orange-600 dark:text-orange-400 text-center">
          ⚠️ You have unsaved changes
        </div>
      )}
    </div>
  );
};

// Copy Permissions Component
const CopyPermissionsButton = ({ onCopy, currentUserId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadUsers();
    }
  }, [isOpen]);

  const loadUsers = async () => {
    try {
      const allUsers = await dbOperations.getAll('profiles');
      const filteredUsers = allUsers.filter(u => u.id !== currentUserId);
      setUsers(filteredUsers);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const handleCopy = () => {
    if (selectedUserId) {
      onCopy(selectedUserId);
      setIsOpen(false);
      setSelectedUserId('');
    } else {
      toast.error('Please select a user');
    }
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)} variant="outline" size="sm">
        <Copy size={16} className="mr-2" />
        Copy From User
      </Button>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Copy Permissions">
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Select a user to copy their permissions
          </p>
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-dark-text"
          >
            <option value="">Select a user...</option>
            {users.map(user => (
              <option key={user.id} value={user.id}>
                {user.name} ({user.email}) - {user.role}
              </option>
            ))}
          </select>
          <div className="flex justify-end gap-2">
            <Button onClick={() => setIsOpen(false)} variant="outline">Cancel</Button>
            <Button onClick={handleCopy} className="bg-blue-600 hover:bg-blue-700">Copy Permissions</Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default PermissionMatrix;
