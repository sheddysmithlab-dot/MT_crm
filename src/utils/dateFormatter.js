/**
 * Date formatting utilities for consistent dd/mm/yyyy format across the application
 */

/**
 * Format a date to dd/mm/yyyy format
 * @param {Date|string} date - Date object or date string
 * @returns {string} Formatted date string in dd/mm/yyyy format
 */
export const formatDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB');
};

/**
 * Get current date in dd/mm/yyyy format
 * @returns {string} Current date in dd/mm/yyyy format
 */
export const getCurrentDate = () => {
  return new Date().toLocaleDateString('en-GB');
};

/**
 * Get current date in yyyy-mm-dd format (for input fields)
 * @returns {string} Current date in yyyy-mm-dd format
 */
export const getCurrentDateISO = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Convert date to yyyy-mm-dd format (for storing in database)
 * @param {Date|string} date - Date object or date string
 * @returns {string} Date in yyyy-mm-dd format
 */
export const toISODate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
