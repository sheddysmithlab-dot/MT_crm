/**
 * Hook to use GST-only filtering in components
 * Automatically applies GST filters based on current user's role
 */
import { useMemo } from 'react';
import { useAuthStore } from '@/store/authManagementStore';
import { isGstOnlyMode, applyGstFilter, filterGstColumns } from '@/utils/gstFilter';

/**
 * Hook to get GST-filtered data
 * @param {Array|Object} data - Data to filter
 * @returns {Array|Object} - Filtered data if GST mode active, otherwise original
 */
export const useGstFilter = (data) => {
  const { user, profile } = useAuthStore();

  return useMemo(() => {
    const userWithProfile = { ...user, profile, role: profile?.role };
    return applyGstFilter(data, userWithProfile);
  }, [data, user, profile]);
};

/**
 * Hook to check if current user is in GST-only mode
 * @returns {boolean} - True if GST-only mode is active
 */
export const useGstOnlyMode = () => {
  const { user, profile } = useAuthStore();

  return useMemo(() => {
    const userWithProfile = { ...user, profile, role: profile?.role };
    return isGstOnlyMode(userWithProfile);
  }, [user, profile]);
};

/**
 * Hook to get GST-filtered columns for tables
 * @param {Array} columns - Column definitions
 * @returns {Array} - Filtered columns if GST mode active, otherwise original
 */
export const useGstColumns = (columns) => {
  const isGstMode = useGstOnlyMode();

  return useMemo(() => {
    if (!isGstMode) return columns;
    return filterGstColumns(columns);
  }, [columns, isGstMode]);
};

export default useGstFilter;
