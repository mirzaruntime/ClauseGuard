/**
 * Timezone strategy: every date is stored and compared in UTC.
 * Formatting into a user's local timezone is a presentation concern.
 */

export function parseIsoDate(value: unknown): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value !== 'string' || value.trim() === '') return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function isPast(date: Date, reference: Date = new Date()): boolean {
  return date.getTime() < reference.getTime();
}

export function subtractDays(date: Date, days: number): Date {
  return new Date(date.getTime() - days * 24 * 60 * 60 * 1000);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}
