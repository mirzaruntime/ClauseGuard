import { lazy, Suspense, useEffect, useLayoutEffect } from 'react';
import { BrowserRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { onUnauthorized } from '@/api';
import { useTheme } from '@/hooks/useTheme';
import { useThemeStore } from '@/store/theme.store';
import { useAuthStore } from '@/store/auth.store';
import { ProtectedRoute } from '@/routes/ProtectedRoute';
import { PublicOnlyRoute } from '@/routes/PublicOnlyRoute';
import { PageLoader } from '@/components/shared/PageLoader';

// Public marketing/auth pages and every protected page are each their own
// chunk, loaded on navigation rather than bundled into the initial payload.
const LandingPage = lazy(() => import('@/pages/LandingPage').then((m) => ({ default: m.LandingPage })));
const LoginPage = lazy(() => import('@/pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('@/pages/RegisterPage').then((m) => ({ default: m.RegisterPage })));
const ForgotPasswordPage = lazy(() =>
  import('@/pages/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })),
);
const ResetPasswordPage = lazy(() =>
  import('@/pages/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })),
);
const DashboardPage = lazy(() => import('@/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const ContractsListPage = lazy(() =>
  import('@/pages/ContractsListPage').then((m) => ({ default: m.ContractsListPage })),
);
const ContractUploadPage = lazy(() =>
  import('@/pages/ContractUploadPage').then((m) => ({ default: m.ContractUploadPage })),
);
const ContractDetailPage = lazy(() =>
  import('@/pages/ContractDetailPage').then((m) => ({ default: m.ContractDetailPage })),
);
const ObligationsPage = lazy(() =>
  import('@/pages/ObligationsPage').then((m) => ({ default: m.ObligationsPage })),
);
const RemindersPage = lazy(() => import('@/pages/RemindersPage').then((m) => ({ default: m.RemindersPage })));
const SettingsPage = lazy(() => import('@/pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const UnauthorizedPage = lazy(() =>
  import('@/pages/UnauthorizedPage').then((m) => ({ default: m.UnauthorizedPage })),
);
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })));

/**
 * Wires the API client's 401 hook to a real navigation. Lives inside the
 * router so it has access to react-router's navigate function.
 */
function UnauthorizedBridge() {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    onUnauthorized(() => {
      logout();
      navigate('/unauthorized', { replace: true });
    });
  }, [navigate, logout]);

  return null;
}

function AppRoutes() {
  const initialize = useAuthStore((s) => s.initialize);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  return (
    <>
      <UnauthorizedBridge />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public */}
          <Route path="/" element={<LandingPage />} />
          <Route element={<PublicOnlyRoute />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>
          {/* Recovery links must remain reachable even when an old session exists. */}
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Protected */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/contracts" element={<ContractsListPage />} />
            <Route path="/contracts/upload" element={<ContractUploadPage />} />
            <Route path="/contracts/:id" element={<ContractDetailPage />} />
            <Route path="/obligations" element={<ObligationsPage />} />
            <Route path="/reminders" element={<RemindersPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          {/* Error / fallback */}
          <Route path="/unauthorized" element={<UnauthorizedPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </>
  );
}

function ThemeBootstrap() {
  const { theme, resolvedTheme } = useTheme();
  const syncSystemTheme = useThemeStore((state) => state.syncSystemTheme);

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = resolvedTheme;
    root.style.colorScheme = resolvedTheme;

    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const onSystemThemeChange = () => syncSystemTheme();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', onSystemThemeChange);
      return () => mediaQuery.removeEventListener('change', onSystemThemeChange);
    }

    mediaQuery.addListener(onSystemThemeChange);
    return () => mediaQuery.removeListener(onSystemThemeChange);
  }, [resolvedTheme, syncSystemTheme, theme]);

  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeBootstrap />
      <div className="min-h-screen">
        <AppRoutes />
      </div>
    </BrowserRouter>
  );
}
