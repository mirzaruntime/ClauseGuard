import { CheckCircle2, Clock, FileSearch, FileWarning, Loader2, ShieldCheck, XCircle, AlarmClock, Send, Ban } from 'lucide-react';
import { Badge, type BadgeProps } from '@/components/ui/Badge';
import type { ContractStatus, ObligationStatus, ReminderStatus } from '@/types/api';

const CONTRACT_MAP: Record<ContractStatus, { label: string; tone: BadgeProps['tone']; icon: React.ComponentType<{ className?: string }> }> = {
  uploaded: { label: 'Uploaded', tone: 'neutral', icon: Clock },
  processing: { label: 'Processing', tone: 'blue', icon: Loader2 },
  analyzing: { label: 'Analyzing', tone: 'blue', icon: Loader2 },
  review: { label: 'Awaiting review', tone: 'warning', icon: FileSearch },
  completed: { label: 'Completed', tone: 'success', icon: CheckCircle2 },
  failed: { label: 'Failed', tone: 'danger', icon: FileWarning },
};

const OBLIGATION_MAP: Record<ObligationStatus, { label: string; tone: BadgeProps['tone']; icon: React.ComponentType<{ className?: string }> }> = {
  potential: { label: 'Potential', tone: 'orange', icon: FileSearch },
  confirmed: { label: 'Confirmed', tone: 'success', icon: ShieldCheck },
  rejected: { label: 'Rejected', tone: 'danger', icon: XCircle },
  completed: { label: 'Completed', tone: 'neutral', icon: CheckCircle2 },
  overdue: { label: 'Overdue', tone: 'danger', icon: AlarmClock },
};

const REMINDER_MAP: Record<ReminderStatus, { label: string; tone: BadgeProps['tone']; icon: React.ComponentType<{ className?: string }> }> = {
  scheduled: { label: 'Scheduled', tone: 'blue', icon: Clock },
  sent: { label: 'Sent', tone: 'success', icon: Send },
  cancelled: { label: 'Cancelled', tone: 'neutral', icon: Ban },
  failed: { label: 'Failed', tone: 'danger', icon: FileWarning },
};

function StatusBadgeBase({
  entry,
  spin,
}: {
  entry: { label: string; tone: BadgeProps['tone']; icon: React.ComponentType<{ className?: string }> };
  spin?: boolean;
}) {
  const Icon = entry.icon;
  return (
    <Badge tone={entry.tone}>
      <Icon className={spin ? 'h-3 w-3 shrink-0 animate-spin' : 'h-3 w-3 shrink-0'} />
      <span>{entry.label}</span>
    </Badge>
  );
}

export function ContractStatusBadge({ status }: { status: ContractStatus }) {
  const entry = CONTRACT_MAP[status];
  return <StatusBadgeBase entry={entry} spin={status === 'processing' || status === 'analyzing'} />;
}

export function ObligationStatusBadge({ status }: { status: ObligationStatus }) {
  return <StatusBadgeBase entry={OBLIGATION_MAP[status]} />;
}

export function ReminderStatusBadge({ status }: { status: ReminderStatus }) {
  return <StatusBadgeBase entry={REMINDER_MAP[status]} />;
}
