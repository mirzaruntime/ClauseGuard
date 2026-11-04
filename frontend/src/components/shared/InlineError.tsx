export function InlineError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-1.5 text-xs font-medium text-[var(--color-danger)]">
      {message}
    </p>
  );
}
