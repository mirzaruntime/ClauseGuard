import { AlertTriangle, CheckCircle2, FileSearch, FileText, Sparkles, RefreshCw } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { Progress } from '@/components/ui/Progress';
import { Button } from '@/components/ui/Button';
import { HungrySquidLoader } from '@/components/ui/HungrySquidLoader';
import { formatFileSize } from '@/lib/format';
import type { UploadPhase } from '@/hooks/useContractUpload';
import type { Contract } from '@/types/api';

const STEPS: { phase: UploadPhase; label: string }[] = [
  { phase: 'uploading', label: 'Uploading' },
  { phase: 'processing', label: 'Extracting text' },
  { phase: 'analyzing', label: 'AI analysis' },
  { phase: 'review', label: 'Ready for review' },
];

function stepIndex(phase: UploadPhase): number {
  const order: UploadPhase[] = ['uploading', 'processing', 'analyzing', 'review', 'completed'];
  const i = order.indexOf(phase);
  return i === -1 ? 0 : i;
}

export function UploadStatusPanel({
  phase,
  uploadProgress,
  file,
  contract,
  errorMessage,
  onRetry,
  onReset,
  onGoToContract,
}: {
  phase: UploadPhase;
  uploadProgress: number;
  file: File | null;
  contract: Contract | null;
  errorMessage: string | null;
  onRetry: () => void;
  onReset: () => void;
  onGoToContract: () => void;
}) {
  const shouldReduceMotion = useReducedMotion();

  if (phase === 'error') {
    return (
      <div className="rounded-[var(--radius-xl)] border border-[var(--color-danger-border)] bg-[var(--color-danger-bg)] p-6 sm:p-7 shadow-[var(--shadow-xs)]">
        <div className="flex items-start gap-3.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-danger-bg)] text-[var(--color-danger)] shrink-0">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm sm:text-base font-bold text-[var(--color-text-primary)]">
              {contract ? 'Contract processing interrupted' : 'Upload failed'}
            </p>
            <p className="mt-1 text-xs sm:text-sm text-[var(--color-text-muted)] leading-relaxed">
              {errorMessage}
            </p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2.5">
          {file && !contract && (
            <Button variant="secondary" size="sm" onClick={onRetry} className="gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" />
              Retry upload
            </Button>
          )}
          {contract && (
            <Button variant="secondary" size="sm" onClick={onGoToContract}>
              View contract record
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onReset}>
            Upload another document
          </Button>
        </div>
      </div>
    );
  }

  const currentIndex = stepIndex(phase);
  const isDone = phase === 'review' || phase === 'completed';

  return (
    <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 sm:p-8 shadow-[var(--shadow-xs)] space-y-6">
      {/* File Info Header */}
      <div className="flex items-center gap-3.5 pb-4 border-b border-[var(--color-border)]">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-navy)]/5 text-[var(--color-text-primary)] border border-[var(--color-border)]">
          <FileText className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm sm:text-base font-bold text-[var(--color-text-primary)]">
            {contract?.title ?? file?.name ?? 'Contract Document'}
          </p>
          {file && (
            <p className="text-xs text-[var(--color-text-faint)] font-mono">
              {formatFileSize(file.size)} · PDF
            </p>
          )}
        </div>
      </div>

      {/* Uploading Phase */}
      {phase === 'uploading' && (
        <div className="space-y-2.5 py-4">
          <div className="flex items-center justify-between text-xs font-semibold text-[var(--color-text-primary)]">
            <span>Uploading encrypted PDF to storage…</span>
            <span className="font-mono">{uploadProgress}%</span>
          </div>
          <Progress value={uploadProgress} className="h-2" />
        </div>
      )}

      {/* Processing or AI Analyzing with Hungry Squid Loader */}
      {(phase === 'processing' || phase === 'analyzing') && (
        <motion.div
          key={phase}
          initial={shouldReduceMotion ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={
            shouldReduceMotion ? { duration: 0 } : { duration: 0.26, ease: [0.16, 1, 0.3, 1] }
          }
          className="py-6 flex flex-col items-center justify-center rounded-[var(--radius-lg)] bg-[var(--color-surface-subtle)]/70 p-6 border border-[var(--color-border)] cg-grid-pattern-subtle"
        >
          <HungrySquidLoader
            size="md"
            label={
              phase === 'processing'
                ? 'Extracting Contract Text…'
                : 'AI Analyzing Legal Obligations…'
            }
            sublabel={
              phase === 'processing'
                ? 'Parsing document text, identifying legal parties, and scanning clauses.'
                : 'Groq AI is reviewing extracted clauses to identify obligations, trigger conditions, and deadlines.'
            }
          />
        </motion.div>
      )}

      {/* Complete State */}
      {isDone && (
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={
            shouldReduceMotion ? { duration: 0 } : { duration: 0.28, ease: [0.16, 1, 0.3, 1] }
          }
          className="flex items-start gap-3.5 rounded-[var(--radius-lg)] bg-[var(--color-success-bg)] border border-[var(--color-success-border)] p-4 sm:p-5"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-success-bg)] text-[var(--color-success)] shrink-0 mt-0.5">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-[var(--color-success)]">
              Analysis complete — {contract?.obligationCount ?? 0} potential obligation
              {contract?.obligationCount === 1 ? '' : 's'} identified
            </p>
            <p className="mt-1 text-xs text-[var(--color-success)] leading-relaxed">
              Every clause suggestion requires your review and confirmation before it is tracked as a binding obligation.
            </p>
          </div>
        </motion.div>
      )}

      {/* Progress Step Bar */}
      <ol className="flex items-center gap-2 pt-2" aria-label="Upload progress">
        {STEPS.map((step, i) => {
          const reached = currentIndex >= i;
          const active = currentIndex === i && !isDone;
          return (
            <li key={step.phase} className="flex flex-1 items-center gap-2">
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                  reached
                    ? 'bg-[var(--color-navy)] text-white shadow-xs'
                    : 'bg-[var(--color-surface-subtle)] text-[var(--color-text-faint)]'
                }`}
              >
                {reached && !active ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
              </span>
              <span
                className={`hidden truncate text-xs sm:inline ${
                  reached ? 'font-semibold text-[var(--color-text-primary)]' : 'text-[var(--color-text-faint)]'
                }`}
              >
                {step.label}
              </span>
              {i < STEPS.length - 1 && (
                <span className={`h-0.5 flex-1 ${reached ? 'bg-[var(--color-navy)]' : 'bg-[var(--color-surface-subtle)]'}`} />
              )}
            </li>
          );
        })}
      </ol>

      {/* Action Buttons */}
      {isDone && (
        <div className="flex flex-wrap gap-2.5 pt-2">
          <Button size="md" variant="accent" onClick={onGoToContract} className="shadow-sm">
            <Sparkles className="h-4 w-4" />
            Review Obligations Now
          </Button>
          <Button variant="outline" size="md" onClick={onReset}>
            <FileSearch className="h-4 w-4" />
            Upload Another Contract
          </Button>
        </div>
      )}
    </div>
  );
}
