import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { AISuggestionCard } from './AISuggestionCard';
import { ObligationEditDialog } from './ObligationEditDialog';
import { ConfirmationDialog } from '@/components/shared/ConfirmationDialog';
import { AIDisclaimer } from '@/components/shared/AIDisclaimer';
import { EmptyState } from '@/components/shared/EmptyState';
import { StaggerContainer, StaggerItem } from '@/components/shared/Motion';
import { useObligationActions } from '@/hooks/useObligationActions';
import type { Obligation } from '@/types/api';

/** Review workflow for a contract's `potential` obligations: confirm, edit, or reject. */
export function ReviewPanel({
  obligations,
  onObligationUpdated,
}: {
  obligations: Obligation[];
  onObligationUpdated: (obligation: Obligation) => void;
}) {
  const { pendingId, confirm, reject, edit } = useObligationActions(onObligationUpdated);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  const editingObligation = obligations.find((o) => o.id === editingId) ?? null;
  const rejectingObligation = obligations.find((o) => o.id === rejectingId) ?? null;

  if (obligations.length === 0) {
    return (
      <EmptyState
        icon={Sparkles}
        title="Nothing awaiting review"
        description="Confirmed, rejected and completed obligations appear in the sections below."
      />
    );
  }

  return (
    <div className="space-y-4">
      <AIDisclaimer />

      <StaggerContainer staggerDelay={0.04} className="space-y-4">
        {obligations.map((obligation) => (
          <StaggerItem key={obligation.id}>
            <AISuggestionCard
              obligation={obligation}
              isPending={pendingId === obligation.id}
              onConfirm={() => void confirm(obligation.id)}
              onEdit={() => setEditingId(obligation.id)}
              onReject={() => setRejectingId(obligation.id)}
            />
          </StaggerItem>
        ))}
      </StaggerContainer>

      <ObligationEditDialog
        key={editingId ?? "closed"}
        obligation={editingObligation}
        open={editingId !== null}
        onOpenChange={(open) => !open && setEditingId(null)}
        isSaving={pendingId === editingId}
        onSave={(payload) => (editingId ? edit(editingId, payload) : Promise.resolve())}
      />

      <ConfirmationDialog
        open={rejectingId !== null}
        onOpenChange={(open) => !open && setRejectingId(null)}
        title="Reject this obligation?"
        description={`"${rejectingObligation?.title}" will be marked as rejected. You can restore it for review later if needed.`}
        confirmLabel="Reject"
        variant="danger"
        onConfirm={() => (rejectingId ? reject(rejectingId) : Promise.resolve())}
      />
    </div>
  );
}
