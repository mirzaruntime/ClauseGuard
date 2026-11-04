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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { InlineError } from '@/components/shared/InlineError';
import { useReminderEligibleObligations } from '@/hooks/useReminders';
import type { CreateReminderRequest } from '@/types/api';

function toLocalDatetimeValue(iso: string): string {
  const date = new Date(iso);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

/**
 * Create-reminder dialog. Obligation choices come from the real,
 * currently-eligible list.
 *
 * The parent mounts this with a key that changes every time the dialog is
 * opened (see RemindersPage), so each open starts from clean state without
 * needing an effect to reset form fields when `open` flips to true.
 */
export function ReminderCreateDialog({
  open,
  onOpenChange,
  onCreate,
  isSaving,
  presetObligationId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (payload: CreateReminderRequest) => Promise<unknown>;
  isSaving: boolean;
  presetObligationId?: string;
}) {
  const { data: obligations, isLoading } = useReminderEligibleObligations();
  const [obligationId, setObligationId] = useState(presetObligationId ?? '');
  const [reminderDate, setReminderDate] = useState('');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<{ obligation?: string; date?: string }>({});
  // Computed once at mount (a fresh mount happens each time the dialog opens),
  // rather than calling Date.now() directly during render.
  const [minDateTime] = useState(() => toLocalDatetimeValue(new Date(Date.now() + 60_000).toISOString()));

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors: typeof errors = {};
    if (!obligationId) nextErrors.obligation = 'Choose an obligation';
    if (!reminderDate) nextErrors.date = 'Choose a date and time';
    else if (new Date(reminderDate).getTime() <= Date.now()) nextErrors.date = 'Must be in the future';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    await onCreate({
      obligationId,
      reminderDate: new Date(reminderDate).toISOString(),
      message: message.trim() || undefined,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New reminder</DialogTitle>
          <DialogDescription>
            Reminders are delivered by ClauseGuard's scheduler at the time you choose.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <Label htmlFor="reminder-obligation">Obligation</Label>
            <Select value={obligationId} onValueChange={setObligationId} disabled={Boolean(presetObligationId)}>
              <SelectTrigger id="reminder-obligation" className="mt-1.5">
                <SelectValue placeholder={isLoading ? 'Loading obligations...' : 'Choose an obligation'} />
              </SelectTrigger>
              <SelectContent>
                {(obligations ?? []).map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.obligation && <InlineError message={errors.obligation} />}
            {!isLoading && obligations?.length === 0 && (
              <p className="mt-1.5 text-xs text-[var(--color-text-faint)]">
                No confirmed or overdue obligations available yet.
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="reminder-date">Reminder date &amp; time</Label>
            <Input
              id="reminder-date"
              type="datetime-local"
              value={reminderDate}
              onChange={(e) => setReminderDate(e.target.value)}
              min={minDateTime}
              className="mt-1.5"
            />
            {errors.date && <InlineError message={errors.date} />}
          </div>

          <div>
            <Label htmlFor="reminder-message">Message (optional)</Label>
            <Textarea
              id="reminder-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="mt-1.5"
              rows={3}
              placeholder="What should this reminder say?"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSaving}>
              Schedule reminder
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
