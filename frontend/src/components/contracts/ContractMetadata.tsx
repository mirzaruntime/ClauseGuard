import { useState } from 'react';
import {
  AlertTriangle,
  Building2,
  Calendar,
  ChevronDown,
  ChevronUp,
  Clock,
  FileText,
  HardDrive,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { ContractStatusBadge } from '@/components/shared/StatusBadge';
import { formatDate, formatDateTime, formatFileSize } from '@/lib/format';
import type { Contract } from '@/types/api';

export function ContractMetadata({ contract }: { contract: Contract }) {
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const isSummaryLong = Boolean(contract.contractSummary && contract.contractSummary.length > 220);

  return (
    <Card className="divide-y divide-[var(--color-border)]">
      <CardHeader className="pb-3 sm:pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-[var(--color-text-primary)]">
            Contract details
          </CardTitle>
          <ContractStatusBadge status={contract.status} />
        </div>
      </CardHeader>

      <CardContent className="space-y-3.5 p-4 sm:p-5">
        {/* Structured metadata list */}
        <div className="space-y-2.5 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-[var(--color-text-muted)]">
              <FileText className="h-3.5 w-3.5 text-[var(--color-text-faint)]" />
              File name
            </span>
            <span className="font-medium text-[var(--color-text-primary)] truncate max-w-[180px]" title={contract.originalFileName}>
              {contract.originalFileName}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-[var(--color-text-muted)]">
              <HardDrive className="h-3.5 w-3.5 text-[var(--color-text-faint)]" />
              File size
            </span>
            <span className="font-medium text-[var(--color-text-primary)]">
              {formatFileSize(contract.fileSize)}
            </span>
          </div>

          {contract.pageCount !== undefined && (
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-[var(--color-text-muted)]">
                <Layers className="h-3.5 w-3.5 text-[var(--color-text-faint)]" />
                Pages
              </span>
              <span className="font-medium text-[var(--color-text-primary)]">{contract.pageCount}</span>
            </div>
          )}

          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-[var(--color-text-muted)]">
              <Calendar className="h-3.5 w-3.5 text-[var(--color-text-faint)]" />
              Uploaded
            </span>
            <span className="font-medium text-[var(--color-text-primary)]">{formatDate(contract.createdAt)}</span>
          </div>

          {contract.analyzedAt && (
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-[var(--color-text-muted)]">
                <Clock className="h-3.5 w-3.5 text-[var(--color-text-faint)]" />
                Analyzed
              </span>
              <span className="font-medium text-[var(--color-text-primary)]">
                {formatDateTime(contract.analyzedAt)}
              </span>
            </div>
          )}
        </div>

        {/* Truncation notice */}
        {contract.textTruncated && (
          <div className="flex items-start gap-2 rounded-[var(--radius-md)] border border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] p-2.5">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--color-warning)]" />
            <p className="text-[11px] leading-relaxed text-[var(--color-warning)]">
              Document length exceeded standard extraction limits. Late clauses may have been omitted from review.
            </p>
          </div>
        )}

        {/* Parties identified */}
        {contract.parties.length > 0 && (
          <div className="pt-2 border-t border-[var(--color-border)]">
            <p className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-text-primary)]">
              <Building2 className="h-3.5 w-3.5 text-[var(--color-text-faint)]" />
              Parties identified
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {contract.parties.map((party) => (
                <span
                  key={party}
                  className="inline-flex items-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-2 py-0.5 text-[11px] font-medium text-[var(--color-text-primary)]"
                >
                  {party}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* AI Summary */}
        {contract.contractSummary && (
          <div className="pt-2 border-t border-[var(--color-border)]">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-text-primary)]">
                <Sparkles className="h-3.5 w-3.5 text-[var(--color-orange-text)]" />
                AI Summary
              </p>
              {isSummaryLong && (
                <button
                  type="button"
                  onClick={() => setSummaryExpanded(!summaryExpanded)}
                  className="flex items-center gap-0.5 text-[11px] font-medium text-[var(--color-link)] hover:underline"
                >
                  {summaryExpanded ? (
                    <>
                      Less <ChevronUp className="h-3 w-3" />
                    </>
                  ) : (
                    <>
                      Expand <ChevronDown className="h-3 w-3" />
                    </>
                  )}
                </button>
              )}
            </div>
            <p
              className={`mt-1.5 text-xs leading-relaxed text-[var(--color-text-muted)] bg-[var(--color-surface-subtle)] p-2.5 rounded-[var(--radius-md)] border border-[var(--color-border)] ${
                !summaryExpanded && isSummaryLong ? 'line-clamp-4' : ''
              }`}
            >
              {contract.contractSummary}
            </p>
          </div>
        )}

        {/* Processing failure */}
        {contract.processingError && (
          <div className="flex items-start gap-2.5 rounded-[var(--radius-md)] border border-[var(--color-danger)]/25 bg-[var(--color-danger-bg)] p-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-danger)]" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[var(--color-text-primary)]">
                Processing failed at {contract.processingError.stage}
              </p>
              <p className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">
                {contract.processingError.message}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
