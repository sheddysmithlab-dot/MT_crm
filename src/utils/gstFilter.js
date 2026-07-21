/**
 * GST Field Filter Utility
 * Filters data to show only GST-related records and fields for Admin role
 */

// GST-related field keys
const GST_KEYS = [
  'gst', 'gstin', 'gstno', 'gst_no', 'gst_number', 'gstNumber',
  'gst_rate', 'gstRate', 'gst_amount', 'gstAmount',
  'igst', 'cgst', 'sgst', 'ugst', 'cess',
  'tax', 'taxAmount', 'tax_amount', 'taxRate', 'tax_rate',
  'hsn', 'hsnCode', 'hsn_code', 'sac', 'sacCode', 'sac_code'
];

/**
 * Check if an object contains any GST-related field
 */
export const hasGstField = (obj) => {
  if (!obj || typeof obj !== 'object') return false;
  
  const objString = JSON.stringify(obj).toLowerCase();
  return GST_KEYS.some(key => {
    const regex = new RegExp(`"${key.toLowerCase()}"`, 'i');
    return regex.test(objString);
  });
};

/**
 * Check if a field key is GST-related
 */
export const isGstField = (key) => {
  if (!key || typeof key !== 'string') return false;
  
  const lowerKey = key.toLowerCase();
  return GST_KEYS.some(gstKey => lowerKey.includes(gstKey.toLowerCase()));
};

/**
 * Filter array to only include records with GST fields
 */
export const filterGstRecords = (records) => {
  if (!Array.isArray(records)) return [];
  return records.filter(record => hasGstField(record));
};

/**
 * Filter object to only include GST-related fields
 */
export const filterGstFields = (obj) => {
  if (!obj || typeof obj !== 'object') return {};
  
  const filtered = {};
  
  Object.keys(obj).forEach(key => {
    if (isGstField(key)) {
      filtered[key] = obj[key];
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      const nested = filterGstFields(obj[key]);
      if (Object.keys(nested).length > 0) {
        filtered[key] = nested;
      }
    }
  });
  
  return filtered;
};

/**
 * Get GST-only columns from table columns
 */
export const filterGstColumns = (columns) => {
  if (!Array.isArray(columns)) return [];
  
  return columns.filter(col => {
    const key = col.key || col.field || col.accessor || '';
    return isGstField(key) || isGstField(col.header || col.label || '');
  });
};

/**
 * Check if user should see GST-only filtered data
 */
export const isGstOnlyMode = (user) => {
  if (!user) return false;
  return user.gstOnlyMode === true || user.profile?.gstOnlyMode === true || user.role === 'Admin';
};

/**
 * Apply GST filter to data based on user settings
 */
export const applyGstFilter = (data, user) => {
  if (!isGstOnlyMode(user)) {
    return data;
  }

  if (Array.isArray(data)) {
    return filterGstRecords(data);
  } else if (typeof data === 'object' && data !== null) {
    return filterGstFields(data);
  }
  
  return data;
};

export default {
  hasGstField,
  isGstField,
  filterGstRecords,
  filterGstFields,
  filterGstColumns,
  isGstOnlyMode,
  applyGstFilter,
  GST_KEYS
};
