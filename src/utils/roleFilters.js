/**
 * Role-Based Data Filtering Utilities
 * Handles Admin GST-only mode and other role-specific data filtering
 */

// GST-related field identifiers
export const GST_FIELDS = [
  'gst',
  'gstin',
  'gst_number',
  'cgst',
  'sgst',
  'igst',
  'gst_rate',
  'gst_amount',
  'gst_percentage',
  'tax_amount',
  'taxable_amount',
  'total_gst'
];

/**
 * Check if a role requires GST-only mode
 * @param {string} role - User's role
 * @returns {boolean}
 */
export const isGstOnlyRole = (role) => {
  return role === 'Admin';
};

/**
 * Filter table columns based on role
 * For Admin: Only GST-related columns
 * For others: All columns
 * 
 * @param {Array} columns - Array of column definitions
 * @param {string} role - User's role
 * @returns {Array} Filtered columns
 */
export const filterColumnsByRole = (columns, role) => {
  if (!columns || !Array.isArray(columns)) return [];
  
  if (isGstOnlyRole(role)) {
    return columns.filter(col => {
      const colId = col.id ? col.id.toLowerCase() : '';
      const colAccessor = col.accessor ? col.accessor.toLowerCase() : '';
      const colField = col.field ? col.field.toLowerCase() : '';
      
      return GST_FIELDS.includes(colId) ||
             GST_FIELDS.includes(colAccessor) ||
             GST_FIELDS.includes(colField) ||
             GST_FIELDS.some(gstField => colId.includes(gstField));
    });
  }
  
  return columns;
};

/**
 * Filter data rows based on role
 * For Admin: Only show rows with GST data
 * For others: Show all rows
 * 
 * @param {Array} data - Array of data rows
 * @param {string} role - User's role
 * @returns {Array} Filtered data
 */
export const filterDataByRole = (data, role) => {
  if (!data || !Array.isArray(data)) return [];
  
  if (isGstOnlyRole(role)) {
    // Only show rows that have at least one GST field with a value
    return data.filter(row => 
      GST_FIELDS.some(field => {
        const value = row[field];
        return value !== null && value !== undefined && value !== '' && value !== 0;
      })
    );
  }
  
  return data;
};

/**
 * Check if a field should be visible based on role
 * @param {string} fieldName - Name of the field
 * @param {string} role - User's role
 * @returns {boolean}
 */
export const isFieldVisible = (fieldName, role) => {
  if (!fieldName) return true;
  
  const fieldLower = fieldName.toLowerCase();
  
  if (isGstOnlyRole(role)) {
    return GST_FIELDS.includes(fieldLower) || 
           GST_FIELDS.some(gstField => fieldLower.includes(gstField));
  }
  
  return true;
};

/**
 * Filter form fields based on role
 * @param {Array} formFields - Array of form field definitions
 * @param {string} role - User's role
 * @returns {Array} Filtered form fields
 */
export const filterFormFieldsByRole = (formFields, role) => {
  if (!formFields || !Array.isArray(formFields)) return [];
  
  if (isGstOnlyRole(role)) {
    return formFields.filter(field => 
      isFieldVisible(field.name || field.id || field.key, role)
    );
  }
  
  return formFields;
};

/**
 * Get role-specific export columns
 * @param {Array} columns - All available columns
 * @param {string} role - User's role
 * @returns {Array} Columns to include in export
 */
export const getExportColumnsByRole = (columns, role) => {
  return filterColumnsByRole(columns, role);
};

/**
 * Check if user can see full data or GST-only
 * @param {string} role - User's role
 * @returns {object} Capabilities object
 */
export const getRoleCapabilities = (role) => {
  return {
    gstOnlyMode: isGstOnlyRole(role),
    canViewFullData: !isGstOnlyRole(role),
    canExportFullData: !isGstOnlyRole(role),
    canModifyNonGstFields: !isGstOnlyRole(role)
  };
};

/**
 * Filter object properties based on role
 * Used for API requests, data saves, etc.
 * 
 * @param {object} obj - Object to filter
 * @param {string} role - User's role
 * @returns {object} Filtered object
 */
export const filterObjectByRole = (obj, role) => {
  if (!obj || typeof obj !== 'object') return obj;
  
  if (isGstOnlyRole(role)) {
    const filtered = {};
    GST_FIELDS.forEach(field => {
      if (obj.hasOwnProperty(field)) {
        filtered[field] = obj[field];
      }
    });
    
    // Always include ID and timestamps
    if (obj.id) filtered.id = obj.id;
    if (obj.created_at) filtered.created_at = obj.created_at;
    if (obj.updated_at) filtered.updated_at = obj.updated_at;
    
    return filtered;
  }
  
  return obj;
};

/**
 * Apply role-based validation rules
 * @param {object} data - Data to validate
 * @param {string} role - User's role
 * @returns {object} Validation result { valid: boolean, errors: Array }
 */
export const validateDataByRole = (data, role) => {
  const errors = [];
  
  if (isGstOnlyRole(role)) {
    // Admin can only modify GST fields
    const nonGstFields = Object.keys(data).filter(key => 
      !GST_FIELDS.includes(key.toLowerCase()) &&
      !['id', 'created_at', 'updated_at'].includes(key)
    );
    
    if (nonGstFields.length > 0) {
      errors.push({
        type: 'ROLE_RESTRICTION',
        message: `Admin role can only modify GST-related fields. Invalid fields: ${nonGstFields.join(', ')}`,
        fields: nonGstFields
      });
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Get display message for role restrictions
 * @param {string} role - User's role
 * @returns {string|null} Message to display to user
 */
export const getRoleRestrictionMessage = (role) => {
  if (isGstOnlyRole(role)) {
    return 'As an Admin, you can only view and modify GST-related fields (GSTIN, CGST, SGST, IGST, GST Amount, etc.)';
  }
  
  return null;
};

/**
 * React Hook: Use role-based filtering
 * @param {string} role - User's role
 * @returns {object} Filtering utilities
 */
export const useRoleFilters = (role) => {
  return {
    isGstOnlyMode: isGstOnlyRole(role),
    filterColumns: (columns) => filterColumnsByRole(columns, role),
    filterData: (data) => filterDataByRole(data, role),
    isFieldVisible: (fieldName) => isFieldVisible(fieldName, role),
    filterFormFields: (fields) => filterFormFieldsByRole(fields, role),
    capabilities: getRoleCapabilities(role),
    restrictionMessage: getRoleRestrictionMessage(role),
    validateData: (data) => validateDataByRole(data, role)
  };
};

export default {
  isGstOnlyRole,
  filterColumnsByRole,
  filterDataByRole,
  isFieldVisible,
  filterFormFieldsByRole,
  getExportColumnsByRole,
  getRoleCapabilities,
  filterObjectByRole,
  validateDataByRole,
  getRoleRestrictionMessage,
  useRoleFilters,
  GST_FIELDS
};
