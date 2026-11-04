import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { AlertCircle, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { Logo } from '@/components/layout/Logo';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { Label } from '@/components/ui/Label';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { InlineError } from '@/components/shared/InlineError';
import { useAuthStore } from '@/store/auth.store';
import { ApiRequestError } from '@/api';
import { validateEmail } from '@/lib/validation';

export function LoginPage() {
  const shouldReduceMotion = useReducedMotion();
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = (location.state as { from?: string } | null)?.from ?? '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setServerError(null);

    const emailError = validateEmail(email);
    const passwordError = password ? null : 'Password is required';
    setFieldErrors({ email: emailError ?? undefined, password: passwordError ?? undefined });
    if (emailError || passwordError) return;

    setIsSubmitting(true);
    try {
      await login(email, password);
      navigate(redirectTo, { replace: true });
    } catch (error) {
      setServerError(
        error instanceof ApiRequestError ? error.message : 'Something went wrong. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[var(--color-bg)] px-4 py-12">
      <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
        <ThemeToggle compact />
      </div>
      <motion.div
        initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.35, ease: 'easeOut' }}
        className="w-full max-w-md relative z-10"
      >
        <div className="mb-8 flex justify-center">
          <Link to="/" className="transition-transform duration-150 hover:scale-[1.02]">
            <Logo />
          </Link>
        </div>

        <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-7 shadow-[var(--shadow-md)] sm:p-9">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-text-primary)]">
            Sign in to ClauseGuard
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[var(--color-text-muted)]">
            Access your contract obligation repository
          </p>

          {serverError && (
            <div className="mt-5 flex items-start gap-2.5 rounded-[var(--radius-md)] border border-[var(--color-danger-border)] bg-[var(--color-danger-bg)] px-3.5 py-2.5">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-danger)]" />
              <p className="text-xs sm:text-sm text-[var(--color-danger)]">{serverError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
            <div>
              <Label htmlFor="email" className="text-xs font-semibold text-[var(--color-text-primary)]">
                Email address
              </Label>
              <div className="relative mt-1.5">
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={Boolean(fieldErrors.email)}
                  aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                  className="pl-3"
                  placeholder="name@company.com"
                />
              </div>
              {fieldErrors.email && <InlineError message={fieldErrors.email} />}
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs font-semibold text-[var(--color-text-primary)]">
                  Password
                </Label>
                <Link
                  to="/forgot-password"
                  className="rounded-sm text-xs font-semibold text-[var(--color-link)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative mt-1.5">
                <Input
                  id="password"
                  type={passwordVisible ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={Boolean(fieldErrors.password)}
                  aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                  className="pr-10"
                  placeholder="••••••••••••"
                />
                <button
                  type="button"
                  aria-label={passwordVisible ? 'Hide password' : 'Show password'}
                  aria-pressed={passwordVisible}
                  onClick={() => setPasswordVisible((visible) => !visible)}
                  className="absolute inset-y-0 right-0 flex h-10 w-10 items-center justify-center rounded-r-[var(--radius-md)] text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)]"
                >
                  {passwordVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {fieldErrors.password && <InlineError message={fieldErrors.password} />}
            </div>

            <Button type="submit" className="w-full mt-2 shadow-sm" size="lg" isLoading={isSubmitting}>
              <span>Sign in</span>
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs sm:text-sm text-[var(--color-text-muted)]">
          Don't have an enterprise account?{' '}
          <Link to="/register" className="font-semibold text-[var(--color-text-primary)] hover:text-[var(--color-orange-text)] hover:underline">
            Register here
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
