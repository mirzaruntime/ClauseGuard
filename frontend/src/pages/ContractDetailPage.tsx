import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BellRing, ListChecks, Trash2, ShieldCheck, Sparkles, FileText, Calendar, Layers } from 'lucide-react';
import { PageLoader } from '@/components/shared/PageLoader';
import { ErrorState } from '@/components/shared/ErrorState';
import { EmptyState } from '@/components/shared/EmptyState';
import { ConfirmationDialog } from '@/components/shared/ConfirmationDialog';
import { ContractStatusBadge, ReminderStatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { HungrySquidLoader } from '@/components/ui/HungrySquidLoader';
import { ContractMetadata } from '@/components/contracts/ContractMetadata';
import { ReviewPanel } from '@/components/obligations/ReviewPanel';
import { ObligationCard } from '@/components/obligations/ObligationCard';
import { PageTransition, FadeUp } from '@/components/shared/Motion';
import { useContract } from '@/hooks/useContract';
import { useContractObligations } from '@/hooks/useContractObligations';
import { useContractReminders } from '@/hooks/useContractReminders';
import { useObligationActions } from '@/hooks/useObligationActions';
import { contractsApi, ApiRequestError } from '@/api';
import { toast } from '@/store/toast.store';
import { formatDateTime, formatDate, formatFileSize } from '@/lib/format';
import type { Obligation, ObligationStatus } from '@/types/api';

const REVIEWED_STATUSES: ObligationStatus[] = ['confirmed', 'overdue', 'rejected', 'completed'];

export function ContractDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const contractResult = useContract(id);
  const obligationsResult = useContractObligations(id);
  const [obligations, setObligations] = useState<Obligation[] | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const effectiveObligations = obligations ?? obligationsResult.data ?? [];
  const { pendingId, complete, reject, restore } = useObligationActions((updated) => {
    setObligations((current) =>
      (current ?? obligationsResult.data ?? []).map((o) => (o.id === updated.id ? updated : o)),
    );
  });

  const reminders = useContractReminders(effectiveObligations);

  if (contractResult.isLoading) {
    return <PageLoader label="Opening contract…" sublabel="Loading extracted clauses and analysis history" />;
  }

  if (contractResult.isError) {
    const notFound = contractResult.errorCode === 'CONTRACT_NOT_FOUND';
    return (
      <div className="mx-auto max-w-2xl py-12">
        {notFound ? (
          <EmptyState
            icon={ListChecks}
            title="Contract not found"
            description="This contract doesn't exist or you don't have permission to access it."
            action={
              <Button asChild variant="secondary">
                <Link to="/contracts">Back to contracts repository</Link>
              </Button>
            }
          />
        ) : (
          <ErrorState
            message={contractResult.error ?? 'Failed to load contract'}
            isNetworkError={contractResult.errorCode === null}
            onRetry={contractResult.refetch}
          />
        )}
      </div>
    );
  }

  if (!contractResult.data) return null;
  const { contract } = contractResult.data;

  const potential = effectiveObligations.filter((o) => o.status === 'potential');
  const reviewed = effectiveObligations.filter((o) => REVIEWED_STATUSES.includes(o.status));

  const handleObligationUpdated = (updated: Obligation) => {
    setObligations((current) =>
      (current ?? obligationsResult.data ?? []).map((o) => (o.id === updated.id ? updated : o)),
    );
  };

  const handleDelete = async () => {
    if (!id) return;
    try {
      await contractsApi.remove(id);
      toast.success('Contract deleted from workspace');
      navigate('/contracts', { replace: true });
    } catch (error) {
      toast.error('Could not delete contract', error instanceof ApiRequestError ? error.message : undefined);
      throw error;
    }
  };

  return (
    <PageTransition className="space-y-5 sm:space-y-6">
      {/* Top Breadcrumb & Action Header */}
      <FadeUp delay={0.04} className="space-y-3">
        <Link
          to="/contracts"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors w-fit"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Contracts Repository
        </Link>

        {/* Contract Title & Meta Banner */}
        <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6 shadow-[var(--shadow-xs)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
                  {contract.title}
                </h1>
                <ContractStatusBadge status={contract.status} />
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-[var(--color-text-muted)] font-medium">
                <span className="flex items-center gap-1 text-[var(--color-text-primary)]">
                  <FileText className="h-3.5 w-3.5 text-[var(--color-text-faint)]" />
                  <span className="font-mono">{contract.originalFileName}</span>
                </span>
                <span>·</span>
                <span>{formatFileSize(contract.fileSize)}</span>
                {contract.pageCount !== undefined && (
                  <>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <Layers className="h-3.5 w-3.5 text-[var(--color-text-faint)]" />
                      {contract.pageCount} pages
                    </span>
                  </>
                )}
                <span>·</span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-[var(--color-text-faint)]" />
                  Uploaded {formatDate(contract.createdAt)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteOpen(true)}
                className="text-[var(--color-text-muted)] hover:text-[var(--color-danger)] hover:border-[var(--color-danger-border)] hover:bg-[var(--color-danger-bg)]"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete contract
              </Button>
            </div>
          </div>
        </div>
      </FadeUp>

      {/* 2-Column Split: Workflow (Left 2 cols) vs Document Metadata & Reminders (Right 1 col) */}
      <FadeUp delay={0.1}>
        <div className="grid grid-cols-1 gap-5 sm:gap-6 lg:grid-cols-3">
        {/* Main Obligation Workflow */}
        <div className="lg:col-span-2 space-y-5">
          {contract.status === 'review' || contract.status === 'completed' ? (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-[var(--color-text-primary)] tracking-tight">
                    Obligation Review Workflow
                  </h2>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                    Examine AI-extracted legal terms and confirm or modify them before tracking.
                  </p>
                </div>
              </div>

              {obligationsResult.isLoading && !obligations ? (
                <div className="space-y-4">
                  <Skeleton className="h-40 w-full rounded-[var(--radius-xl)]" />
                  <Skeleton className="h-40 w-full rounded-[var(--radius-xl)]" />
                </div>
              ) : obligationsResult.isError ? (
                <ErrorState
                  message={obligationsResult.error ?? 'Failed to load obligations'}
                  onRetry={obligationsResult.refetch}
                />
              ) : (
                <Tabs defaultValue="potential">
                  <TabsList className="mb-4">
                    <TabsTrigger value="potential" className="gap-2">
                      <Sparkles className="h-3.5 w-3.5 text-[var(--color-orange-text)]" />
                      <span>Needs review</span>
                      {potential.length > 0 && (
                        <span className="inline-flex items-center justify-center rounded-full bg-[var(--color-orange)] text-white px-2 py-0.2 text-[10px] font-bold">
                          {potential.length}
                        </span>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="reviewed" className="gap-2">
                      <ShieldCheck className="h-3.5 w-3.5 text-[var(--color-success)]" />
                      <span>Reviewed obligations</span>
                      {reviewed.length > 0 && (
                        <span className="inline-flex items-center justify-center rounded-full bg-[var(--color-surface-subtle)] px-2 py-0.2 text-[10px] font-semibold text-[var(--color-text-primary)]">
                          {reviewed.length}
                        </span>
                      )}
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="potential" className="mt-0">
                    <ReviewPanel obligations={potential} onObligationUpdated={handleObligationUpdated} />
                  </TabsContent>

                  <TabsContent value="reviewed" className="mt-0">
                    {reviewed.length === 0 ? (
                      <EmptyState
                        icon={ListChecks}
                        title="No reviewed obligations yet"
                        description="Once you confirm or reject suggestions in the 'Needs review' tab, they will appear here with active status tracking."
                      />
                    ) : (
                      <div className="space-y-3.5">
                        {reviewed.map((obligation) => (
                          <ObligationCard
                            key={obligation.id}
                            obligation={obligation}
                            isPending={pendingId === obligation.id}
                            onComplete={() => void complete(obligation.id)}
                            onReject={() => void reject(obligation.id)}
                            onRestore={() => void restore(obligation.id)}
                          />
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              )}
            </div>
          ) : contract.status === 'failed' ? null : (
            /* Document Processing / AI Analyzing with Hungry Squid Loader */
            <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-12 text-center shadow-[var(--shadow-xs)] cg-grid-pattern-subtle">
              <HungrySquidLoader
                size="lg"
                label={
                  contract.status === 'analyzing'
                    ? 'AI Analysis in Progress…'
                    : 'Extracting Contract Text…'
                }
                sublabel="ClauseGuard is parsing PDF clauses, identifying legal parties, and structuring potential obligations."
              />
            </div>
          )}
        </div>

        {/* Contract Inspection Sidebar */}
        <div className="space-y-5">
          <ContractMetadata contract={contract} />

          {/* Scheduled Reminders Panel */}
          <Card className="shadow-[var(--shadow-xs)]">
            <CardHeader className="pb-3 sm:pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-bold text-[var(--color-text-primary)]">
                <BellRing className="h-4 w-4 text-[var(--color-text-primary)]" />
                Scheduled reminders
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-4 sm:p-5 pt-0 sm:pt-0">
              {reminders.isLoading ? (
                <Skeleton className="h-14 w-full" />
              ) : reminders.reminders.length === 0 ? (
                <p className="text-xs text-[var(--color-text-faint)] leading-relaxed">
                  No reminders scheduled for this contract's obligations yet.
                </p>
              ) : (
                <ul className="divide-y divide-[var(--color-border)]">
                  {reminders.reminders.map((reminder) => (
                    <li key={reminder.id} className="flex items-center justify-between gap-2 py-2">
                      <span className="truncate text-xs text-[var(--color-text-primary)] font-semibold">
                        {formatDateTime(reminder.reminderDate)}
                      </span>
                      <ReminderStatusBadge status={reminder.status} />
                    </li>
                  ))}
                </ul>
              )}
              <div className="pt-2 border-t border-[var(--color-border)]">
                <Button asChild variant="link" size="sm" className="text-xs text-[var(--color-link)] font-medium">
                  <Link to="/reminders">Manage all reminders →</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </FadeUp>

      <ConfirmationDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete this contract?"
        description="This permanently removes the contract record, all extracted obligations, and associated reminder schedules. This action cannot be undone."
        confirmLabel="Delete contract"
        variant="danger"
        onConfirm={handleDelete}
      />
    </PageTransition>
  );
}
