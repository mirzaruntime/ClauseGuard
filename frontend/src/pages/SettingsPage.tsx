import { useState, useEffect, type FormEvent } from 'react';
import {
  KeyRound,
  User as UserIcon,
  ShieldCheck,
  Activity,
  CheckCircle2,
  Fingerprint,
  Calendar,
  Lock,
  FileCheck2,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Label } from '@/components/ui/Label';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { InlineError } from '@/components/shared/InlineError';
import { PageTransition, PageHeaderReveal, FadeUp } from '@/components/shared/Motion';
import { useAuthStore } from '@/store/auth.store';
import { authApi, healthApi, ApiRequestError } from '@/api';
import { toast } from '@/store/toast.store';
import { validateName, validatePassword } from '@/lib/validation';
import { formatDate } from '@/lib/format';
import type { HealthReadiness } from '@/types/api';

export function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const [name, setName] = useState(user?.name ?? '');
  const [nameError, setNameError] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordErrors, setPasswordErrors] = useState<{ current?: string; next?: string }>({});
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const [health, setHealth] = useState<HealthReadiness | null>(null);

  useEffect(() => {
    void healthApi.ready().then(setHealth).catch(() => null);
  }, []);

  if (!user) return null;

  const handleProfileSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const error = validateName(name);
    setNameError(error);
    if (error) return;

    setIsSavingProfile(true);
    try {
      const updated = await authApi.updateProfile({ name: name.trim() });
      setUser(updated);
      toast.success('Profile details updated');
    } catch (err) {
      toast.error('Could not update profile', err instanceof ApiRequestError ? err.message : undefined);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const errors = {
      current: currentPassword ? undefined : 'Current password is required',
      next: validatePassword(newPassword) ?? undefined,
    };
    setPasswordErrors(errors);
    if (errors.current || errors.next) return;

    setIsSavingPassword(true);
    try {
      await authApi.changePassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      toast.success('Security password updated');
    } catch (err) {
      toast.error(
        'Could not update password',
        err instanceof ApiRequestError ? err.message : undefined,
      );
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <PageTransition className="space-y-5 sm:space-y-6">
      <PageHeaderReveal>
        <PageHeader
          title="Account & System Settings"
          description="Manage your enterprise user profile, authentication security credentials, and AI engine status."
        />
      </PageHeaderReveal>

      {/* 2-Column Responsive Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
        {/* Left Column (7 cols): Profile Details & Security Credentials */}
        <div className="lg:col-span-7 space-y-5 sm:space-y-6">
          {/* Profile Details Card */}
          <FadeUp delay={0.06}>
            <Card className="shadow-[var(--shadow-xs)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base font-bold text-[var(--color-text-primary)]">
                  <UserIcon className="h-4.5 w-4.5 text-[var(--color-text-primary)]" />
                  Profile Details
                </CardTitle>
                <CardDescription>Your registered identity across all workspace documents and contracts</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleProfileSubmit} className="space-y-4" noValidate>
                  <div>
                    <Label htmlFor="settings-name" className="text-xs font-semibold text-[var(--color-text-primary)]">
                      Full name
                    </Label>
                    <Input
                      id="settings-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      aria-invalid={Boolean(nameError)}
                      className="mt-1.5"
                    />
                    {nameError && <InlineError message={nameError} />}
                  </div>
                  <div>
                    <Label htmlFor="settings-email" className="text-xs font-semibold text-[var(--color-text-primary)]">
                      Email address
                    </Label>
                    <Input
                      id="settings-email"
                      value={user.email}
                      disabled
                      className="mt-1.5 bg-[var(--color-surface-subtle)] text-[var(--color-text-muted)] font-mono text-xs"
                    />
                    <p className="mt-1.5 text-xs text-[var(--color-text-faint)]">
                      Managed authentication identity. Contact workspace admin to modify.
                    </p>
                  </div>
                  <div className="pt-2">
                    <Button type="submit" variant="primary" isLoading={isSavingProfile}>
                      Save profile changes
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </FadeUp>

          {/* Security Credentials Card */}
          <FadeUp delay={0.12}>
            <Card className="shadow-[var(--shadow-xs)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base font-bold text-[var(--color-text-primary)]">
                  <KeyRound className="h-4.5 w-4.5 text-[var(--color-text-primary)]" />
                  Security &amp; Password
                </CardTitle>
                <CardDescription>Ensure your account is protected with strong password entropy</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordSubmit} className="space-y-4" noValidate>
                  <div>
                    <Label htmlFor="current-password" className="text-xs font-semibold text-[var(--color-text-primary)]">
                      Current password
                    </Label>
                    <Input
                      id="current-password"
                      type="password"
                      autoComplete="current-password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      aria-invalid={Boolean(passwordErrors.current)}
                      className="mt-1.5"
                    />
                    {passwordErrors.current && <InlineError message={passwordErrors.current} />}
                  </div>
                  <div>
                    <Label htmlFor="new-password" className="text-xs font-semibold text-[var(--color-text-primary)]">
                      New password
                    </Label>
                    <Input
                      id="new-password"
                      type="password"
                      autoComplete="new-password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      aria-invalid={Boolean(passwordErrors.next)}
                      className="mt-1.5"
                    />
                    {passwordErrors.next && <InlineError message={passwordErrors.next} />}
                    <p className="mt-1.5 text-xs text-[var(--color-text-faint)]">
                      Minimum 10 characters, requiring uppercase, lowercase, and numeric characters.
                    </p>
                  </div>
                  <div className="pt-2">
                    <Button type="submit" variant="secondary" isLoading={isSavingPassword}>
                      Update password
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </FadeUp>
        </div>

        {/* Right Column (5 cols): Real Account Information, Diagnostics, & Compliance */}
        <div className="lg:col-span-5 space-y-5 sm:space-y-6">
          {/* Account Profile & Identity Metadata */}
          <FadeUp delay={0.08}>
            <Card className="shadow-[var(--shadow-xs)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm font-bold text-[var(--color-text-primary)]">
                  <Fingerprint className="h-4 w-4 text-[var(--color-text-primary)]" />
                  Account Identity &amp; Role
                </CardTitle>
                <CardDescription>Verified workspace member credentials</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                <div className="flex items-center justify-between py-2 border-b border-[var(--color-border)] text-xs">
                  <span className="text-[var(--color-text-muted)] font-medium">Account ID</span>
                  <span className="font-mono text-[11px] text-[var(--color-text-primary)] font-semibold truncate max-w-[160px]">
                    {user.id}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-[var(--color-border)] text-xs">
                  <span className="text-[var(--color-text-muted)] font-medium flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-[var(--color-text-faint)]" />
                    Member Since
                  </span>
                  <span className="text-[var(--color-text-primary)] font-medium">{formatDate(user.createdAt)}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-[var(--color-border)] text-xs">
                  <span className="text-[var(--color-text-muted)] font-medium flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5 text-[var(--color-text-faint)]" />
                    Session Status
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--color-success)]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-success)]" />
                    Authenticated (Bearer)
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1 text-xs">
                  <span className="text-[var(--color-text-muted)] font-medium">Last Profile Update</span>
                  <span className="text-[var(--color-text-faint)] font-mono text-[11px]">
                    {formatDate(user.updatedAt)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </FadeUp>

          {/* System Diagnostics & AI Readiness Card */}
          {health && (
            <FadeUp delay={0.14}>
              <Card className="shadow-[var(--shadow-xs)] bg-[var(--color-surface-subtle)]/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm font-bold text-[var(--color-text-primary)]">
                    <Activity className="h-4 w-4 text-[var(--color-text-primary)]" />
                    AI Engine &amp; Infrastructure
                  </CardTitle>
                  <CardDescription>Real-time backend infrastructure and LLM connectivity</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2.5">
                  <div className="rounded-lg bg-[var(--color-surface)] p-3 border border-[var(--color-border)] shadow-xs flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-semibold text-[var(--color-text-faint)] uppercase">Database</p>
                      <p className="text-xs font-bold text-[var(--color-text-primary)] capitalize mt-0.5">{health.database}</p>
                    </div>
                    <CheckCircle2 className="h-4.5 w-4.5 text-[var(--color-success)]" />
                  </div>

                  <div className="rounded-lg bg-[var(--color-surface)] p-3 border border-[var(--color-border)] shadow-xs flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-semibold text-[var(--color-text-faint)] uppercase">Groq AI Engine</p>
                      <p className="text-xs font-bold text-[var(--color-text-primary)] mt-0.5">
                        {health.aiConfigured ? 'Connected & Ready' : 'Standby'}
                      </p>
                    </div>
                    <CheckCircle2 className="h-4.5 w-4.5 text-[var(--color-success)]" />
                  </div>

                  <div className="rounded-lg bg-[var(--color-surface)] p-3 border border-[var(--color-border)] shadow-xs flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-semibold text-[var(--color-text-faint)] uppercase">System Uptime</p>
                      <p className="text-xs font-bold text-[var(--color-text-primary)] font-mono mt-0.5">
                        {Math.round(health.uptimeSeconds / 60)}m active
                      </p>
                    </div>
                    <ShieldCheck className="h-4.5 w-4.5 text-[var(--color-text-primary)]" />
                  </div>
                </CardContent>
              </Card>
            </FadeUp>
          )}

          {/* Legal Compliance & Human Approval Safeguard */}
          <FadeUp delay={0.18}>
            <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              <div className="flex items-start gap-2.5">
                <FileCheck2 className="h-4 w-4 text-[var(--color-text-primary)] shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-[var(--color-text-primary)]">Human-in-the-Loop Review Policy</h4>
                  <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">
                    AI assists by highlighting potential obligations and deadlines. Legally binding actions require explicit confirmation by a workspace member.
                  </p>
                </div>
              </div>
            </div>
          </FadeUp>
        </div>
      </div>
    </PageTransition>
  );
}
