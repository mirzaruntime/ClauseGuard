import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Logo } from '@/components/layout/Logo';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { Label } from '@/components/ui/Label';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { InlineError } from '@/components/shared/InlineError';
import { ApiRequestError, authApi } from '@/api';
import { validateEmail } from '@/lib/validation';

const GENERIC_SUCCESS = 'If an account exists with this email address and email delivery is available, a password reset link will be sent shortly.';

export function ForgotPasswordPage() {
  const reduceMotion = useReducedMotion();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setRequestError(null);
    const error = validateEmail(email);
    setEmailError(error);
    if (error) return;

    setIsSubmitting(true);
    try {
      await authApi.forgotPassword(email.trim());
      setSubmitted(true);
    } catch (requestFailure) {
      setRequestError(
        requestFailure instanceof ApiRequestError
          ? requestFailure.message
          : 'We could not process your request. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

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
              <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-text-primary)]">Check your email</h1>
              <p className="mt-3 text-sm leading-relaxed text-[var(--color-text-muted)]">{GENERIC_SUCCESS}</p>
              <Link to="/login" className="mt-6 inline-flex items-center gap-2 rounded-sm text-sm font-semibold text-[var(--color-link)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to login
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-text-primary)]">Forgot your password?</h1>
              <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-muted)]">Enter the email address associated with your account and we’ll send a reset link if it exists.</p>
              {requestError && (
                <div role="alert" className="mt-5 flex items-start gap-2.5 rounded-[var(--radius-md)] border border-[var(--color-danger-border)] bg-[var(--color-danger-bg)] px-3.5 py-2.5">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-danger)]" aria-hidden="true" />
                  <p className="text-xs text-[var(--color-danger)] sm:text-sm">{requestError}</p>
                </div>
              )}
              <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
                <div>
                  <Label htmlFor="recovery-email" className="text-xs font-semibold text-[var(--color-text-primary)]">Email address</Label>
                  <Input
                    id="recovery-email"
                    type="email"
                    autoComplete="email"
                    autoFocus
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    aria-invalid={Boolean(emailError)}
                    aria-describedby={emailError ? 'recovery-email-error' : undefined}
                    className="mt-1.5"
                    placeholder="name@company.com"
                  />
                  {emailError && <div id="recovery-email-error"><InlineError message={emailError} /></div>}
                </div>
                <Button type="submit" className="w-full" size="lg" isLoading={isSubmitting}>
                  <span>Send reset link</span><ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
                </Button>
              </form>
              <Link to="/login" className="mt-6 inline-flex items-center gap-2 rounded-sm text-sm font-semibold text-[var(--color-link)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to login
              </Link>
            </>
          )}
        </section>
      </motion.main>
    </div>
  );
}
