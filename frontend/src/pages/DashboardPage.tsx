import { Link } from 'react-router-dom';
import { FileText, ListChecks, FileSearch, AlarmClock, Sparkles, ArrowRight, BellRing } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { ErrorState } from '@/components/shared/ErrorState';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { StatCard } from '@/components/dashboard/StatCard';
import { StatCardSkeleton } from '@/components/dashboard/StatCardSkeleton';
import { ObligationDistributionChart } from '@/components/dashboard/ObligationDistributionChart';
import { RecentContractsList } from '@/components/dashboard/RecentContractsList';
import { PendingReviewList } from '@/components/dashboard/PendingReviewList';
import { UpcomingRemindersList } from '@/components/dashboard/UpcomingRemindersList';
import { DeadlineIndicator } from '@/components/shared/DeadlineIndicator';
import { EmptyState } from '@/components/shared/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { PageTransition, PageHeaderReveal, FadeUp, StaggerContainer, StaggerItem } from '@/components/shared/Motion';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useAuthStore } from '@/store/auth.store';

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { data, isLoading, isError, error, errorCode, refetch } = useDashboardData();

  const firstName = user?.name.split(' ')[0] ?? '';
  const pendingCount = data?.stats.potential ?? 0;

  return (
    <PageTransition className="space-y-5 sm:space-y-6">
      <PageHeaderReveal>
        <PageHeader
          title={`Welcome back${firstName ? `, ${firstName}` : ''}`}
          description="Executive contract intelligence — active commitments, AI review backlog, and upcoming deadlines."
        />
      </PageHeaderReveal>

      {isError && (
        <ErrorState
          message={error ?? 'Failed to load dashboard data'}
          isNetworkError={errorCode === null}
          onRetry={refetch}
        />
      )}

      {!isError && (
        <>
          {/* Priority 1: Attention Required Banner if backlog exists */}
          {data && pendingCount > 0 && (
            <FadeUp delay={0.06}>
              <div className="relative overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-border)] border-l-4 border-l-[var(--color-orange)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-xs)] sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--color-orange-subtle)] text-[var(--color-orange-text)]">
                      <Sparkles className="h-5 w-5" />
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
                        {pendingCount} contract obligation{pendingCount === 1 ? '' : 's'} awaiting human review
                      </h3>
                      <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                        Verify AI extractions to convert them into binding tracked milestones with deadline alerts.
                      </p>
                    </div>
                  </div>
                  <Button asChild size="sm" variant="accent" className="shrink-0 self-start sm:self-center shadow-xs">
                    <Link to="/obligations?status=potential">
                      Open Review Queue
                      <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </Link>
                  </Button>
                </div>
              </div>
            </FadeUp>
          )}

          {/* KPI Metrics Strip */}
          <StaggerContainer
            staggerDelay={0.05}
            delayChildren={0.08}
            className="grid grid-cols-2 gap-3.5 sm:gap-4 lg:grid-cols-4"
          >
            {isLoading || !data ? (
              <>
                <StaggerItem><StatCardSkeleton /></StaggerItem>
                <StaggerItem><StatCardSkeleton /></StaggerItem>
                <StaggerItem><StatCardSkeleton /></StaggerItem>
                <StaggerItem><StatCardSkeleton /></StaggerItem>
              </>
            ) : (
              <>
                <StaggerItem>
                  <StatCard label="Contracts" value={data.contractsTotal} icon={FileText} />
                </StaggerItem>
                <StaggerItem>
                  <StatCard
                    label="Pending review"
                    value={data.stats.potential ?? 0}
                    icon={FileSearch}
                    tone="warning"
                    hint="AI suggestions awaiting decision"
                  />
                </StaggerItem>
                <StaggerItem>
                  <StatCard
                    label="Active obligations"
                    value={data.stats.confirmed ?? 0}
                    icon={ListChecks}
                    tone="success"
                    hint="Binding confirmed commitments"
                  />
                </StaggerItem>
                <StaggerItem>
                  <StatCard
                    label="Overdue deadlines"
                    value={data.stats.overdue ?? 0}
                    icon={AlarmClock}
                    tone={data.stats.overdue ? 'danger' : 'neutral'}
                    hint={data.stats.overdue ? 'Immediate attention needed' : 'All obligations on schedule'}
                  />
                </StaggerItem>
              </>
            )}
          </StaggerContainer>

          {/* Primary Split: Workflow Workspaces (Left 2 cols) vs Pulse & Schedules (Right 1 col) */}
          <div className="grid grid-cols-1 gap-5 sm:gap-6 lg:grid-cols-3">
            {/* Left 2 Columns: Attention Queue & Recent Contracts */}
            <div className="lg:col-span-2 space-y-5 sm:space-y-6">
              {/* Priority 2: Review Queue */}
              <FadeUp delay={0.14}>
                <Card className="shadow-[var(--shadow-xs)]">
                  <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <div>
                      <CardTitle className="text-sm sm:text-base font-bold text-[var(--color-text-primary)]">
                        Review Queue
                      </CardTitle>
                      <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                        AI-identified clauses requiring human decision
                      </p>
                    </div>
                    <Link
                      to="/obligations?status=potential"
                      className="text-xs font-semibold text-[var(--color-link)] hover:text-[var(--color-text-primary)] hover:underline"
                    >
                      View all pending →
                    </Link>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-5 pt-0 sm:pt-0">
                    {isLoading || !data ? (
                      <div className="space-y-3">
                        <Skeleton className="h-12 w-full rounded-[var(--radius-md)]" />
                        <Skeleton className="h-12 w-full rounded-[var(--radius-md)]" />
                      </div>
                    ) : (
                      <PendingReviewList obligations={data.pendingReview} />
                    )}
                  </CardContent>
                </Card>
              </FadeUp>

              {/* Priority 4: Recent Contracts Repository */}
              <FadeUp delay={0.2}>
                <Card className="shadow-[var(--shadow-xs)]">
                  <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <div>
                      <CardTitle className="text-sm sm:text-base font-bold text-[var(--color-text-primary)]">
                        Recent Contracts
                      </CardTitle>
                      <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                        Latest documents added to the repository
                      </p>
                    </div>
                    <Link
                      to="/contracts"
                      className="text-xs font-semibold text-[var(--color-link)] hover:text-[var(--color-text-primary)] hover:underline"
                    >
                      View all contracts →
                    </Link>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-5 pt-0 sm:pt-0">
                    {isLoading || !data ? (
                      <div className="space-y-3">
                        <Skeleton className="h-12 w-full rounded-[var(--radius-md)]" />
                        <Skeleton className="h-12 w-full rounded-[var(--radius-md)]" />
                        <Skeleton className="h-12 w-full rounded-[var(--radius-md)]" />
                      </div>
                    ) : (
                      <RecentContractsList contracts={data.recentContracts} />
                    )}
                  </CardContent>
                </Card>
              </FadeUp>
            </div>

            {/* Right 1 Column: Deadlines, Obligation Health, and Reminders */}
            <div className="space-y-5 sm:space-y-6">
              {/* Priority 3: Approaching Deadlines */}
              <FadeUp delay={0.16}>
                <Card className="shadow-[var(--shadow-xs)]">
                  <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <CardTitle className="text-sm font-bold text-[var(--color-text-primary)]">
                      Approaching Deadlines
                    </CardTitle>
                    <Link
                      to="/obligations"
                      className="text-xs font-semibold text-[var(--color-link)] hover:underline"
                    >
                      All deadlines →
                    </Link>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-5 pt-0 sm:pt-0">
                    {isLoading || !data ? (
                      <div className="space-y-3">
                        <Skeleton className="h-10 w-full rounded-[var(--radius-md)]" />
                        <Skeleton className="h-10 w-full rounded-[var(--radius-md)]" />
                      </div>
                    ) : data.upcomingDeadlines.length === 0 ? (
                      <EmptyState
                        size="compact"
                        icon={AlarmClock}
                        title="No approaching deadlines"
                        description="All active contract obligations have comfortable lead times."
                      />
                    ) : (
                      <ul className="divide-y divide-[var(--color-border)]">
                        {data.upcomingDeadlines.map((obligation) => (
                          <li key={obligation.id} className="flex flex-col gap-1.5 py-3">
                            <span
                              className="truncate text-xs sm:text-sm font-semibold text-[var(--color-text-primary)]"
                              title={obligation.title}
                            >
                              {obligation.title}
                            </span>
                            <DeadlineIndicator deadline={obligation.deadline} status={obligation.status} />
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              </FadeUp>

              {/* Priority 5: Obligation Health & Distribution */}
              <FadeUp delay={0.22}>
                <Card className="shadow-[var(--shadow-xs)]">
                  <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <CardTitle className="text-sm font-bold text-[var(--color-text-primary)]">
                      Obligation Health
                    </CardTitle>
                    <Link
                      to="/obligations"
                      className="text-xs font-semibold text-[var(--color-link)] hover:underline"
                    >
                      Details →
                    </Link>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-5 pt-0 sm:pt-0">
                    {isLoading || !data ? (
                      <Skeleton className="h-44 w-full rounded-[var(--radius-md)]" />
                    ) : (
                      <ObligationDistributionChart stats={data.stats} />
                    )}
                  </CardContent>
                </Card>
              </FadeUp>

              {/* Upcoming Reminders */}
              <FadeUp delay={0.26}>
                <Card className="shadow-[var(--shadow-xs)]">
                  <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm font-bold text-[var(--color-text-primary)]">
                      <BellRing className="h-4 w-4 text-[var(--color-text-primary)]" />
                      Upcoming Reminders
                    </CardTitle>
                    <Link
                      to="/reminders"
                      className="text-xs font-semibold text-[var(--color-link)] hover:underline"
                    >
                      Manage →
                    </Link>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-5 pt-0 sm:pt-0">
                    {isLoading || !data ? (
                      <div className="space-y-3">
                        <Skeleton className="h-10 w-full rounded-[var(--radius-md)]" />
                        <Skeleton className="h-10 w-full rounded-[var(--radius-md)]" />
                      </div>
                    ) : (
                      <UpcomingRemindersList reminders={data.upcomingReminders} />
                    )}
                  </CardContent>
                </Card>
              </FadeUp>
            </div>
          </div>
        </>
      )}
    </PageTransition>
  );
}
