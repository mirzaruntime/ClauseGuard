import { useState } from 'react';
import { BellRing, Plus, Clock, ShieldCheck, CalendarCheck2 } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { PaginationBar } from '@/components/shared/Pagination';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { ReminderCard } from '@/components/reminders/ReminderCard';
import { ReminderCreateDialog } from '@/components/reminders/ReminderFormDialog';
import { ReminderEditDialog } from '@/components/reminders/ReminderEditDialog';
import { PageTransition, PageHeaderReveal, FadeUp, StaggerContainer, StaggerItem } from '@/components/shared/Motion';
import { useReminders } from '@/hooks/useReminders';
import { remindersApi, ApiRequestError } from '@/api';
import { toast } from '@/store/toast.store';
import type { Reminder, ReminderStatus, CreateReminderRequest, UpdateReminderRequest } from '@/types/api';

const STATUS_OPTIONS: { value: ReminderStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All schedules' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'sent', label: 'Sent' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'failed', label: 'Failed' },
];

export function RemindersPage() {
  const { data, isLoading, isError, isEmpty, error, errorCode, refetch, setPage, status, setStatus, refresh } =
    useReminders();

  const [createOpen, setCreateOpen] = useState(false);
  const [createSession, setCreateSession] = useState(0);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const handleCreate = async (payload: CreateReminderRequest) => {
    try {
      await remindersApi.create(payload);
      toast.success('Reminder scheduled');
      refresh();
    } catch (err) {
      toast.error('Could not schedule reminder', err instanceof ApiRequestError ? err.message : undefined);
      throw err;
    }
  };

  const handleSaveEdit = async (payload: UpdateReminderRequest) => {
    if (!editingReminder) return;
    setPendingId(editingReminder.id);
    try {
      await remindersApi.update(editingReminder.id, payload);
      toast.success('Reminder updated');
      refresh();
    } catch (err) {
      toast.error('Could not update reminder', err instanceof ApiRequestError ? err.message : undefined);
      throw err;
    } finally {
      setPendingId(null);
    }
  };

  const handleCancel = async (reminder: Reminder) => {
    setPendingId(reminder.id);
    try {
      await remindersApi.remove(reminder.id);
      toast.success('Reminder cancelled');
      refresh();
    } catch (err) {
      toast.error('Could not cancel reminder', err instanceof ApiRequestError ? err.message : undefined);
    } finally {
      setPendingId(null);
    }
  };

  return (
    <PageTransition className="space-y-5 sm:space-y-6">
      <PageHeaderReveal>
        <PageHeader
          title="Reminders Schedule"
          description="Automated notifications for active contract obligations. Monitored and dispatched by the backend scheduler."
          actions={
            <Button
              variant="accent"
              className="shadow-sm"
              onClick={() => {
                setCreateSession((n) => n + 1);
                setCreateOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Schedule reminder
            </Button>
          }
        />
      </PageHeaderReveal>

      {/* Status Filter Pills */}
      <FadeUp delay={0.04}>
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {STATUS_OPTIONS.map((pill) => {
            const isActive = (pill.value === 'all' && !status) || status === pill.value;
            return (
              <button
                key={pill.value}
                type="button"
                onClick={() => setStatus(pill.value === 'all' ? undefined : (pill.value as ReminderStatus))}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-150 cursor-pointer select-none border',
                  isActive
                    ? 'bg-[var(--color-navy)] text-white border-[var(--color-navy)] shadow-xs'
                    : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-text-primary)]',
                )}
              >
                <span>{pill.label}</span>
              </button>
            );
          })}
        </div>
      </FadeUp>

      {isError && (
        <ErrorState message={error ?? 'Failed to load reminders'} isNetworkError={errorCode === null} onRetry={refetch} />
      )}

      {!isError && isLoading && (
        <div className="space-y-3.5">
          <Skeleton className="h-24 w-full rounded-[var(--radius-xl)]" />
          <Skeleton className="h-24 w-full rounded-[var(--radius-xl)]" />
          <Skeleton className="h-24 w-full rounded-[var(--radius-xl)]" />
        </div>
      )}

      {!isError && !isLoading && isEmpty && (
        <FadeUp delay={0.08}>
          <EmptyState
            size="page"
            icon={BellRing}
            title={status ? 'No reminders match this status' : 'No reminders scheduled'}
            description="Create reminder nudges for confirmed obligations to receive proactive alerts before critical legal milestones."
            secondaryContent={
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
                <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[var(--color-text-primary)] mb-1">
                    <Clock className="h-3.5 w-3.5 text-[var(--color-orange)]" />
                    <span>Background Cron</span>
                  </div>
                  <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">
                    Evaluates upcoming deadlines automatically every minute in UTC.
                  </p>
                </div>
                <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[var(--color-text-primary)] mb-1">
                    <CalendarCheck2 className="h-3.5 w-3.5 text-[var(--color-text-primary)]" />
                    <span>Lead Times</span>
                  </div>
                  <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">
                    Custom triggers before contract expirations, audits, or renewal windows.
                  </p>
                </div>
                <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[var(--color-text-primary)] mb-1">
                    <ShieldCheck className="h-3.5 w-3.5 text-[var(--color-success)]" />
                    <span>Delivery Audit</span>
                  </div>
                  <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">
                    Status transitions (scheduled → sent → acknowledged) tracked with timestamps.
                  </p>
                </div>
              </div>
            }
          />
        </FadeUp>
      )}

      {!isError && !isLoading && data && data.reminders.length > 0 && (
        <>
          <StaggerContainer
            staggerDelay={0.035}
            delayChildren={0.06}
            className="space-y-3 sm:space-y-3.5"
          >
            {data.reminders.map((reminder) => (
              <StaggerItem key={reminder.id}>
                <ReminderCard
                  reminder={reminder}
                  isPending={pendingId === reminder.id}
                  onEdit={() => setEditingReminder(reminder)}
                  onCancel={() => void handleCancel(reminder)}
                />
              </StaggerItem>
            ))}
          </StaggerContainer>
          <PaginationBar pagination={data.pagination} onPageChange={setPage} />
        </>
      )}

      <ReminderCreateDialog
        key={createSession}
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreate={handleCreate}
        isSaving={false}
      />

      <ReminderEditDialog
        key={editingReminder?.id ?? "closed"}
        reminder={editingReminder}
        open={editingReminder !== null}
        onOpenChange={(open) => !open && setEditingReminder(null)}
        onSave={handleSaveEdit}
        isSaving={pendingId === editingReminder?.id}
      />
    </PageTransition>
  );
}
