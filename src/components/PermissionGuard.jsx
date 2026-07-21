import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { usePermissionStore } from '@/store/authManagementStore';
import { useAuthStore } from '@/store/authManagementStore';

// Component to guard routes based on permissions
export const PermissionGuard = ({ children, requiredPermission, fallback = null }) => {
  const { permissions, initialized } = usePermissionStore();
  const { isAuthenticated, user } = useAuthStore();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (initialized) {
      setChecking(false);
    }
  }, [initialized]);

  if (checking || !initialized) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-red"></div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // Check if user has required permission
  const hasPermission = permissions.includes(requiredPermission);

  if (!hasPermission) {
    return fallback || <PermissionDenied />;
  }

  return children;
};

// Component to check permission for UI elements
export const PermissionCheck = ({ permission, children, fallback = null }) => {
  const { permissions } = usePermissionStore();

  if (!permissions.includes(permission)) {
    return fallback;
  }

  return children;
};

// Component to check if user has ANY of the permissions
export const PermissionAny = ({ permissions: requiredPerms, children, fallback = null }) => {
  const { permissions } = usePermissionStore();

  const hasAnyPermission = requiredPerms.some(perm => permissions.includes(perm));

  if (!hasAnyPermission) {
    return fallback;
  }

  return children;
};

// Component to check if user has ALL of the permissions
export const PermissionAll = ({ permissions: requiredPerms, children, fallback = null }) => {
  const { permissions } = usePermissionStore();

  const hasAllPermissions = requiredPerms.every(perm => permissions.includes(perm));

  if (!hasAllPermissions) {
    return fallback;
  }

  return children;
};

// Permission Denied Page
const PermissionDenied = () => {
  const location = useLocation();

  return (
    <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
      <div className="text-center max-w-md p-8">
        <div className="mb-6">
          <svg
            className="mx-auto h-24 w-24 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text mb-4">
          Access Denied
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          You don't have permission to access this page. Please contact your administrator if you believe this is an error.
        </p>
        <div className="text-sm text-gray-500 dark:text-gray-500 mb-6">
          Requested path: <code className="bg-gray-200 dark:bg-gray-800 px-2 py-1 rounded">{location.pathname}</code>
        </div>
        <button
          onClick={() => window.history.back()}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Go Back
        </button>
      </div>
    </div>
  );
};

export default PermissionGuard;
