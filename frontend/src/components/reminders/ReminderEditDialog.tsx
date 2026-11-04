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
import type { Reminder, UpdateReminderRequest } from '@/types/api';

function toLocalDatetimeValue(iso: string): string {
  const date = new Date(iso);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

/**
 * The parent renders this with `key={reminder?.id ?? 'closed'}`, so opening a
 * different reminder mounts a fresh instance with correct initial state
 * instead of needing an effect to re-sync form fields.
 */
export function ReminderEditDialog({
  reminder,
  open,
  onOpenChange,
  onSave,
  isSaving,
}: {
  reminder: Reminder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (payload: UpdateReminderRequest) => Promise<unknown>;
  isSaving: boolean;
}) {
  const [reminderDate, setReminderDate] = useState(() =>
    reminder ? toLocalDatetimeValue(reminder.reminderDate) : '',
  );
  const [message, setMessage] = useState(reminder?.message ?? '');
  const [dateError, setDateError] = useState<string | null>(null);

  if (!reminder) return null;

  const isLocked = reminder.status === 'sent';

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (new Date(reminderDate).getTime() <= Date.now()) {
      setDateError('Must be in the future');
      return;
    }
    await onSave({ reminderDate: new Date(reminderDate).toISOString(), message: message.trim() || null });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit reminder</DialogTitle>
          <DialogDescription>
            {isLocked
              ? 'This reminder has already been delivered and cannot be changed.'
              : 'Update the date, time, or message for this reminder.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <Label htmlFor="edit-reminder-date">Reminder date &amp; time</Label>
            <Input
              id="edit-reminder-date"
              type="datetime-local"
              value={reminderDate}
              onChange={(e) => setReminderDate(e.target.value)}
              disabled={isLocked}
              className="mt-1.5"
            />
            {dateError && <InlineError message={dateError} />}
          </div>
          <div>
            <Label htmlFor="edit-reminder-message">Message</Label>
            <Textarea
              id="edit-reminder-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={isLocked}
              className="mt-1.5"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            {!isLocked && (
              <Button type="submit" isLoading={isSaving}>
                Save changes
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
