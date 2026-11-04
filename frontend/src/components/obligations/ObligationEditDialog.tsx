import { useState, type FormEvent } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { Label } from '@/components/ui/Label';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { InlineError } from '@/components/shared/InlineError';
import type { Obligation, UpdateObligationRequest } from '@/types/api';

function toDateInputValue(iso: string | null): string {
  if (!iso) return '';
  return iso.slice(0, 10);
}

/**
 * A controlled edit form for an obligation's editable content fields.
 *
 * The parent renders this with `key={obligation?.id ?? 'closed'}`, so a new
 * obligation (or the dialog re-opening) mounts a fresh instance with correct
 * initial state — no effect needed to "sync" state from a changing prop.
 */
export function ObligationEditDialog({
  obligation,
  open,
  onOpenChange,
  onSave,
  isSaving,
}: {
  obligation: Obligation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (payload: UpdateObligationRequest) => Promise<unknown>;
  isSaving: boolean;
}) {
  const [title, setTitle] = useState(obligation?.title ?? '');
  const [description, setDescription] = useState(obligation?.description ?? '');
  const [deadline, setDeadline] = useState(toDateInputValue(obligation?.deadline ?? null));
  const [noticePeriod, setNoticePeriod] = useState(obligation?.noticePeriod ?? '');
  const [conditionsText, setConditionsText] = useState((obligation?.conditions ?? []).join('\n'));
  const [titleError, setTitleError] = useState<string | null>(null);

  if (!obligation) return null;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) {
      setTitleError('Title is required');
      return;
    }

    const payload: UpdateObligationRequest = {
      title: title.trim(),
      description: description.trim(),
      deadline: deadline ? new Date(deadline).toISOString() : null,
      noticePeriod: noticePeriod.trim() || null,
      conditions: conditionsText
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean),
    };

    await onSave(payload);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit obligation</DialogTitle>
          <DialogDescription>
            Adjust the AI's suggestion. The source clause and confidence score are preserved for reference.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <Label htmlFor="edit-title">Title</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              aria-invalid={Boolean(titleError)}
              className="mt-1.5"
            />
            {titleError && <InlineError message={titleError} />}
          </div>

          <div>
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1.5"
              rows={4}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="edit-deadline">Deadline</Label>
              <Input
                id="edit-deadline"
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="edit-notice">Notice period</Label>
              <Input
                id="edit-notice"
                value={noticePeriod}
                onChange={(e) => setNoticePeriod(e.target.value)}
                placeholder="e.g. 30 days"
                className="mt-1.5"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="edit-conditions">Conditions (one per line)</Label>
            <Textarea
              id="edit-conditions"
              value={conditionsText}
              onChange={(e) => setConditionsText(e.target.value)}
              className="mt-1.5"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSaving}>
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
