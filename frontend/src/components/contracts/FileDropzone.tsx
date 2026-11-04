import { useCallback, useRef, useState, type DragEvent } from 'react';
import { UploadCloud, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

export function FileDropzone({
  onFileSelected,
  disabled,
}: {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
}) {
  const [isDragActive, setIsDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (!file) return;
      onFileSelected(file);
    },
    [onFileSelected],
  );

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragActive(false);
    if (disabled) return;
    handleFiles(event.dataTransfer.files);
  };

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      onClick={() => !disabled && inputRef.current?.click()}
      onKeyDown={(e) => {
        if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setIsDragActive(true);
      }}
      onDragLeave={() => setIsDragActive(false)}
      onDrop={handleDrop}
      className={cn(
        'relative overflow-hidden flex cursor-pointer flex-col items-center justify-center gap-3.5 rounded-[var(--radius-xl)] border-2 border-dashed px-6 py-12 sm:py-16 text-center transition-all duration-200 cg-grid-pattern-subtle',
        'focus-visible:ring-3 focus-visible:ring-[var(--color-focus)]/25',
        isDragActive
          ? 'border-[var(--color-orange)] bg-[var(--color-orange-subtle)] scale-[1.005]'
          : 'border-[var(--color-control-border)] bg-[var(--color-surface)]/80 hover:border-[var(--color-navy)]/50 hover:bg-[var(--color-surface-subtle)]/50 shadow-[var(--shadow-xs)]',
        disabled && 'cursor-not-allowed opacity-60 hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface)]',
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="sr-only"
        disabled={disabled}
        onChange={(e) => handleFiles(e.target.files)}
        aria-label="Choose a PDF contract to upload"
      />
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--color-navy)]/5 text-[var(--color-text-primary)] border border-[var(--color-navy)]/10 shadow-[inset_0_1px_2px_rgba(255,255,255,0.9)] transition-transform duration-200 group-hover:scale-105">
        {isDragActive ? (
          <FileText className="h-7 w-7 text-[var(--color-orange)]" />
        ) : (
          <UploadCloud className="h-7 w-7 text-[var(--color-text-primary)]/70" />
        )}
      </span>
      <div>
        <p className="text-sm sm:text-base font-bold text-[var(--color-text-primary)]">
          {isDragActive ? 'Drop your contract here to begin extraction' : 'Drag & drop your contract, or click to browse'}
        </p>
        <p className="mt-1 text-xs text-[var(--color-text-faint)] font-medium">
          PDF format only · Up to 10MB · Automatically parsed with AI
        </p>
      </div>
    </div>
  );
}
