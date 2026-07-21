/**
 * Higher-Order Component (HOC) for Permission-Based Page Protection
 * Wraps components to enforce role-based access control
 */
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authManagementStore';
import { usePageAccess } from '@/hooks/usePageAccess';
import { isGodMode } from '@/utils/roleDefinitions';

/**
 * HOC to protect pages based on permissions
 * @param {Component} WrappedComponent - Component to wrap
 * @param {string} pageKey - Page key (e.g., 'jobs', 'customer')
 * @param {string} subPageKey - Optional subpage key
 * @returns {Component} - Protected component
 */
export const withPermission = (WrappedComponent, pageKey, subPageKey = null) => {
  return function PermissionProtectedComponent(props) {
    const { user, profile } = useAuthStore();
    const { hasAccess, loading } = usePageAccess();

    // Show loading state
    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-red"></div>
        </div>
      );
    }

    // Check god mode
    if (isGodMode(profile?.role) || user?.id === 'super-admin-sheddy-001' || user?.email === 'Shahidmultaniii') {
      return <WrappedComponent {...props} />;
    }

    // Check page access
    const canAccess = hasAccess(pageKey, subPageKey);

    if (!canAccess) {
      console.warn(`⛔ Access denied to: ${pageKey}${subPageKey ? '/' + subPageKey : ''}`);
      return <Navigate to="/dashboard" replace />;
    }

    return <WrappedComponent {...props} />;
  };
};

/**
 * Component to show when access is denied
 */
export const NoAccess = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md">
        <div className="text-6xl mb-4">🔒</div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Access Denied</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          You don't have permission to access this page. Please contact your administrator if you believe this is an error.
        </p>
        <a 
          href="/dashboard" 
          className="inline-block px-6 py-3 bg-brand-red text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Return to Dashboard
        </a>
      </div>
    </div>
  );
};

export default withPermission;
