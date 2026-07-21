# Quick Reference: Role-Based Permissions

## Role Hierarchy

```
Super Admin (God Mode)
    ├── Admin (GST-Only Mode)
    ├── Manager (Full Operations)
    ├── Accountant (Financial Focus)
    ├── Employee (Limited Access)
    └── Read Only (View Only)
```

## Common Code Patterns

### 1. Check Current User's Role

```javascript
import { useAuthManagementStore } from '@/store/authManagementStore';

const { currentRole, profile } = useAuthManagementStore();

if (currentRole === 'Admin') {
  // Admin-specific logic
}

// Or check from profile
if (profile?.role === 'Manager') {
  // Manager-specific logic
}
```

### 2. Check Permission

```javascript
const { can, canAny, canAll } = useAuthManagementStore();

// Single permission
if (can('CUSTOMER_CREATE')) {
  return <CreateButton />;
}

// Any of multiple permissions
if (canAny(['CUSTOMER_EDIT', 'CUSTOMER_DELETE'])) {
  return <ActionsMenu />;
}

// All permissions required
if (canAll(['INVOICE_CREATE', 'INVOICE_POST'])) {
  return <CreateAndPostButton />;
}
```

### 3. Apply GST-Only Filtering (Admin Role)

```javascript
import { useRoleFilters } from '@/utils/roleFilters';

const MyTable = () => {
  const { profile } = useAuthManagementStore();
  const { 
    isGstOnlyMode,
    filterColumns,
    filterData,
    restrictionMessage 
  } = useRoleFilters(profile?.role);
  
  const visibleColumns = useMemo(
    () => filterColumns(allColumns),
    [allColumns, filterColumns]
  );
  
  const visibleData = useMemo(
    () => filterData(allData),
    [allData, filterData]
  );
  
  return (
    <>
      {restrictionMessage && (
        <Alert variant="info">{restrictionMessage}</Alert>
      )}
      <DataTable 
        columns={visibleColumns} 
        data={visibleData} 
      />
    </>
  );
};
```

### 4. Conditional Form Fields

```javascript
const MyForm = () => {
  const { profile } = useAuthManagementStore();
  const { isFieldVisible } = useRoleFilters(profile?.role);
  
  return (
    <form>
      {/* Always visible */}
      <input name="id" />
      
      {/* Conditional visibility */}
      {isFieldVisible('customer_name') && (
        <input name="customer_name" />
      )}
      
      {/* GST fields (Admin-only) */}
      {isFieldVisible('gst_amount') && (
        <input name="gst_amount" />
      )}
    </form>
  );
};
```

### 5. Assign Role to User

```javascript
import { applyRoleToUser } from '@/utils/permissionHelpers';
import { useAuthStore } from '@/store/authManagementStore';

const UserManagement = () => {
  const { user: currentUser } = useAuthStore();
  
  const handleRoleChange = async (userId, newRole) => {
    const success = await applyRoleToUser(
      userId,
      newRole,
      currentUser.id // Actor ID for audit
    );
    
    if (success) {
      toast.success('Role updated successfully');
    }
  };
  
  return (
    <select onChange={(e) => handleRoleChange(user.id, e.target.value)}>
      <option value="Admin">Admin</option>
      <option value="Manager">Manager</option>
      <option value="Accountant">Accountant</option>
      <option value="Employee">Employee</option>
      <option value="Read Only">Read Only</option>
    </select>
  );
};
```

### 6. Route Protection

```javascript
import { PermissionGuard } from '@/components/PermissionGuard';

<Route path="/customers/create" element={
  <PermissionGuard requiredPermission="CUSTOMER_CREATE">
    <CreateCustomer />
  </PermissionGuard>
} />
```

### 7. Electron Permission Check

```javascript
// Check if role can perform action
const canEdit = await window.electron.permissions.checkByRole(
  'Manager',
  'Customer',
  'Details',
  'edit'
);

if (canEdit) {
  // Proceed with edit
}
```

### 8. Load User Permissions

```javascript
import { getUserPermissions } from '@/utils/permissionHelpers';

const loadUserPerms = async (userId) => {
  const permissions = await getUserPermissions(userId);
  // Returns array of permission codes like:
  // ['CUSTOMER_VIEW', 'CUSTOMER_CREATE', 'CUSTOMER_EDIT', ...]
};
```

### 9. Check Page Access

```javascript
import { hasPageAccess } from '@/utils/permissionHelpers';

const canAccessCustomerLedger = await hasPageAccess(
  'Manager',
  'Customer',
  'Ledger'
);
```

### 10. Get Role Permissions

```javascript
import { getPermissionsByRole } from '@/utils/permissionHelpers';

const managerPerms = await getPermissionsByRole('Manager');
// Returns: ['*'] for Super Admin or array of permission codes
```

## Permission Codes Reference

### Module Access
- `DASHBOARD_VIEW`
- `JOBS_VIEW`, `JOBS_CREATE`, `JOBS_EDIT`, `JOBS_DELETE`
- `CUSTOMER_VIEW`, `CUSTOMER_CREATE`, `CUSTOMER_EDIT`, `CUSTOMER_DELETE`
- `VENDOR_VIEW`, `VENDOR_CREATE`, `VENDOR_EDIT`, `VENDOR_DELETE`
- `LABOUR_VIEW`, `LABOUR_CREATE`, `LABOUR_EDIT`, `LABOUR_DELETE`
- `SUPPLIER_VIEW`, `SUPPLIER_CREATE`, `SUPPLIER_EDIT`, `SUPPLIER_DELETE`
- `INVENTORY_VIEW`, `INVENTORY_CREATE`, `INVENTORY_EDIT`, `INVENTORY_DELETE`
- `ACCOUNTS_VIEW`, `ACCOUNTS_CREATE`, `ACCOUNTS_EDIT`, `ACCOUNTS_DELETE`
- `SUMMARY_VIEW`, `SUMMARY_EXPORT`
- `DAILY_TASKS_VIEW`, `DAILY_TASKS_CREATE`
- `SETTINGS_VIEW`, `SETTINGS_GENERAL`, `SETTINGS_COMPANY`

### Page-Specific
- `INSPECTION_VIEW`, `INSPECTION_CREATE`
- `ESTIMATE_VIEW`, `ESTIMATE_CREATE`
- `JOBSHEET_VIEW`, `JOBSHEET_CREATE`
- `INVOICE_VIEW`, `INVOICE_CREATE`, `INVOICE_POST`
- `CHALLAN_VIEW`, `CHALLAN_CREATE`, `CHALLAN_POST`
- `CUSTOMER_LEDGER_VIEW`
- `VENDOR_LEDGER_VIEW`
- `LABOUR_LEDGER_VIEW`
- `SUPPLIER_LEDGER_VIEW`

## Roles.json Structure

```json
{
  "RoleName": {
    "label": "Display Name",
    "description": "Role description",
    "gstOnlyMode": true/false,
    "permissions": {
      "godMode": true, // Super Admin only
      "modules": {
        "ModuleName": {
          "pages": {
            "PageName": {
              "view": true/false,
              "create": true/false,
              "edit": true/false,
              "delete": true/false,
              "export": true/false
            }
          }
        }
      }
    }
  }
}
```

## Role Capabilities

| Role | GST-Only | God Mode | Full Data | Export |
|------|----------|----------|-----------|--------|
| Super Admin | ❌ | ✅ | ✅ | ✅ |
| Admin | ✅ | ❌ | ❌ | ❌ |
| Manager | ❌ | ❌ | ✅ | ✅ |
| Accountant | ❌ | ❌ | ✅ | ✅ |
| Employee | ❌ | ❌ | ✅ | ❌ |
| Read Only | ❌ | ❌ | ✅ | ❌ |

## File Locations

- **Roles Definition**: `C:/malwa-crm/Data_base/settings/User_Management/roles.json`
- **Users Data**: `C:/malwa-crm/Data_base/settings/User_Management/users.json`
- **Permission Helpers**: `src/utils/permissionHelpers.js`
- **Role Filters**: `src/utils/roleFilters.js`
- **Auth Store**: `src/store/authManagementStore.js`
- **IPC Handlers**: `electron/ipc-handlers.cjs`

## Debugging

```javascript
// Check current user role
console.log('Current Role:', useAuthManagementStore.getState().currentRole);

// Check permissions
console.log('Permissions:', useAuthManagementStore.getState().permissions);

// Check if GST-only mode
import { isGstOnlyRole } from '@/utils/roleDefinitions';
console.log('GST Only?', isGstOnlyRole(profile?.role));

// Check role config
import { getRoleConfig } from '@/utils/roleDefinitions';
console.log('Role Config:', getRoleConfig('Admin'));
```

## Common Gotchas

1. **Always await permission functions** - They load from file system
2. **Super Admin bypasses all checks** - Don't rely on permission checks for Super Admin
3. **Admin GST-only mode** - Remember to filter data AND columns
4. **Cache is 1 minute** - Role changes may take up to 1 minute to reflect
5. **Role field required** - Users without role default to "Employee"

## Migration from Per-User Permissions

**Old Way (Deprecated):**
```javascript
const perms = user.permissions; // Direct user permissions
if (perms.includes('CUSTOMER_CREATE')) { ... }
```

**New Way (Current):**
```javascript
const { can } = useAuthManagementStore();
if (can('CUSTOMER_CREATE')) { ... }
// Internally fetches from user.role → roles.json
```

## Support

- 📖 Full Documentation: `docs/ROLE_BASED_PERMISSIONS_IMPLEMENTATION_COMPLETE.md`
- 📝 Migration Notes: `docs/ROLE_BASED_PERMISSIONS_MIGRATION_NOTES.md`
- 🔧 Utility Functions: `src/utils/permissionHelpers.js`, `src/utils/roleFilters.js`
