import { Navigate } from 'react-router-dom';
import { usePageAccess } from '@/hooks/usePageAccess';

/**
 * Component to guard routes based on user's page visibility settings
 * Redirects to dashboard if user doesn't have access to the page
 */
const PageAccessGuard = ({ children, pageKey, subPageKey = null }) => {
  const { hasAccess, loading } = usePageAccess();

  // Show loading state while checking access
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-red"></div>
      </div>
    );
  }

  // Check if user has access to this page
  const canAccess = hasAccess(pageKey, subPageKey);

  if (!canAccess) {
    console.warn(`Access denied to page: ${pageKey}${subPageKey ? '/' + subPageKey : ''}`);
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default PageAccessGuard;
