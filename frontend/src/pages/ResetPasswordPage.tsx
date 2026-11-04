import { useLayoutEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { Logo } from '@/components/layout/Logo';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { Label } from '@/components/ui/Label';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { InlineError } from '@/components/shared/InlineError';
import { ApiRequestError, authApi } from '@/api';
import { validatePassword } from '@/lib/validation';

export function ResetPasswordPage() {
  const reduceMotion = useReducedMotion();
  const [token] = useState(() => new URLSearchParams(window.location.search).get('token'));
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ password?: string; confirmPassword?: string }>({});
  const [requestError, setRequestError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [invalidToken, setInvalidToken] = useState(!token);

  // Preserve the router's history state while removing the credential from the address bar.
  useLayoutEffect(() => {
    if (window.location.search.includes('token=')) {
      window.history.replaceState(window.history.state, '', window.location.pathname + window.location.hash);
    }
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setRequestError(null);
    const errors = {
      password: validatePassword(password) ?? undefined,
      confirmPassword: confirmPassword === password ? undefined : 'Passwords do not match',
    };
    setFieldErrors(errors);
    if (errors.password || errors.confirmPassword || !token) return;

    setIsSubmitting(true);
    try {
      await authApi.resetPassword({ token, password });
      setSubmitted(true);
    } catch (failure) {
      const message = failure instanceof ApiRequestError
        ? failure.message
        : 'We could not update your password. Please request a new reset link.';
      setRequestError(message);
      if (failure instanceof ApiRequestError && failure.code === 'INVALID_RESET_TOKEN') setInvalidToken(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const returnToLogin = (
    <Link to="/login" className="mt-6 inline-flex items-center gap-2 rounded-sm text-sm font-semibold text-[var(--color-link)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]">
      <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Return to login
    </Link>
  );

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[var(--color-bg)] px-4 py-12">
      <div className="absolute right-4 top-4 sm:right-6 sm:top-6"><ThemeToggle compact /></div>
      <motion.main
        initial={reduceMotion ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reduceMotion ? { duration: 0 } : { duration: 0.35, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="mb-8 flex justify-center"><Link to="/" aria-label="ClauseGuard home"><Logo /></Link></div>
        <section className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-7 shadow-[var(--shadow-md)] sm:p-9">
          {submitted ? (
            <div role="status" aria-live="polite">
              <CheckCircle2 className="mb-4 h-8 w-8 text-[var(--color-success)]" aria-hidden="true" />
              <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-text-primary)]">Password updated</h1>
              <p className="mt-3 text-sm text-[var(--color-text-muted)]">Your password has been changed. Sign in with your new password.</p>
              {returnToLogin}
            </div>
          ) : invalidToken ? (
            <div role="alert">
              <AlertCircle className="mb-4 h-8 w-8 text-[var(--color-danger)]" aria-hidden="true" />
              <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-text-primary)]">Reset link unavailable</h1>
              <p className="mt-3 text-sm leading-relaxed text-[var(--color-text-muted)]">This reset link is invalid, expired, or already used. Request a new link to continue.</p>
              <Link to="/forgot-password" className="mt-5 inline-flex rounded-sm text-sm font-semibold text-[var(--color-link)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]">Request a new reset link</Link>
              <div>{returnToLogin}</div>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-text-primary)]">Choose a new password</h1>
              <p className="mt-2 text-sm text-[var(--color-text-muted)]">Use at least 10 characters with uppercase, lowercase, and a number.</p>
              {requestError && (
                <div role="alert" className="mt-5 flex items-start gap-2.5 rounded-[var(--radius-md)] border border-[var(--color-danger-border)] bg-[var(--color-danger-bg)] px-3.5 py-2.5">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-danger)]" aria-hidden="true" />
                  <p className="text-xs text-[var(--color-danger)] sm:text-sm">{requestError}</p>
                </div>
              )}
              <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
                <div>
                  <Label htmlFor="new-password" className="text-xs font-semibold text-[var(--color-text-primary)]">New password</Label>
                  <div className="relative mt-1.5">
                    <Input id="new-password" type={passwordVisible ? 'text' : 'password'} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} aria-invalid={Boolean(fieldErrors.password)} aria-describedby={fieldErrors.password ? 'new-password-error' : 'new-password-help'} className="pr-11" />
                    <button type="button" aria-label={passwordVisible ? 'Hide new password' : 'Show new password'} aria-pressed={passwordVisible} onClick={() => setPasswordVisible((visible) => !visible)} className="absolute inset-y-0 right-0 flex h-10 w-10 items-center justify-center rounded-r-[var(--radius-md)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]">
                      {passwordVisible ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                    </button>
                  </div>
                  <p id="new-password-help" className="mt-1.5 text-xs text-[var(--color-text-faint)]">At least 10 characters, including uppercase, lowercase, and a number.</p>
                  {fieldErrors.password && <div id="new-password-error"><InlineError message={fieldErrors.password} /></div>}
                </div>
                <div>
                  <Label htmlFor="confirm-password" className="text-xs font-semibold text-[var(--color-text-primary)]">Confirm new password</Label>
                  <div className="relative mt-1.5">
                    <Input id="confirm-password" type={confirmVisible ? 'text' : 'password'} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} aria-invalid={Boolean(fieldErrors.confirmPassword)} aria-describedby={fieldErrors.confirmPassword ? 'confirm-password-error' : undefined} className="pr-11" />
                    <button type="button" aria-label={confirmVisible ? 'Hide confirmation password' : 'Show confirmation password'} aria-pressed={confirmVisible} onClick={() => setConfirmVisible((visible) => !visible)} className="absolute inset-y-0 right-0 flex h-10 w-10 items-center justify-center rounded-r-[var(--radius-md)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]">
                      {confirmVisible ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                    </button>
                  </div>
                  {fieldErrors.confirmPassword && <div id="confirm-password-error"><InlineError message={fieldErrors.confirmPassword} /></div>}
                </div>
                <Button type="submit" className="w-full" size="lg" isLoading={isSubmitting}>
                  <span>Update password</span><ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
                </Button>
              </form>
              {returnToLogin}
            </>
          )}
        </section>
      </motion.main>
    </div>
  );
}
