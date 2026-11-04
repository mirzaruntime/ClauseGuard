import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { PageLoader } from '@/components/shared/PageLoader';

/** Prevents an already-authenticated user from seeing /login or /register again. */
export function PublicOnlyRoute() {
  const { isAuthenticated, isInitializing } = useAuthStore();

  if (isInitializing) return <PageLoader />;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  return <Outlet />;
}
