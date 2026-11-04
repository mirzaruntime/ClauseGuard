import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { AppShell } from '@/components/layout/AppShell';
import { PageLoader } from '@/components/shared/PageLoader';

/** Gate for authenticated-only routes. Preserves the intended destination for post-login redirect. */
export function ProtectedRoute() {
  const { isAuthenticated, isInitializing } = useAuthStore();
  const location = useLocation();

  if (isInitializing) return <PageLoader />;

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
