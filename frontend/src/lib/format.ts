import { format, formatDistanceToNow } from 'date-fns';

export function formatDate(value: string | Date, pattern = 'MMM d, yyyy'): string {
  return format(new Date(value), pattern);
}

export function formatDateTime(value: string | Date): string {
  return format(new Date(value), "MMM d, yyyy 'at' h:mm a");
}

export function formatRelative(value: string | Date): string {
  return formatDistanceToNow(new Date(value), { addSuffix: true });
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatConfidence(confidence: number | null): string {
  if (confidence === null) return '—';
  return `${Math.round(confidence * 100)}%`;
}
