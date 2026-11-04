import { Link } from 'react-router-dom';
import { FileText, ArrowRight } from 'lucide-react';
import { ContractStatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatRelative } from '@/lib/format';
import type { Contract } from '@/types/api';

export function RecentContractsList({ contracts }: { contracts: Contract[] }) {
  if (contracts.length === 0) {
    return (
      <EmptyState
        size="compact"
        icon={FileText}
        title="No contracts uploaded"
        description="Your recently uploaded and analyzed contracts will appear here."
      />
    );
  }

  return (
    <ul className="divide-y divide-[var(--color-border)]">
      {contracts.map((contract) => (
        <li key={contract.id}>
          <Link
            to={`/contracts/${contract.id}`}
            className="group flex items-center gap-3 py-3 px-2 -mx-2 rounded-[var(--radius-md)] transition-all duration-150 hover:bg-[var(--color-surface-subtle)]"
          >
            <span className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-lg bg-[var(--color-navy)]/5 text-[var(--color-text-primary)] group-hover:bg-[var(--color-navy)] group-hover:text-white transition-all duration-150 border border-[var(--color-border)] shadow-xs">
              <FileText className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs sm:text-sm font-semibold text-[var(--color-text-primary)] group-hover:text-[var(--color-link)] transition-colors">
                {contract.title}
              </p>
              <p className="text-[11px] text-[var(--color-text-faint)] mt-0.5">
                Uploaded {formatRelative(contract.createdAt)}
                {contract.status !== 'failed' && contract.status !== 'uploaded' && (
                  <span className="text-[var(--color-text-muted)] font-medium">
                    {' '}· {contract.obligationCount} obligation{contract.obligationCount === 1 ? '' : 's'}
                  </span>
                )}
              </p>
            </div>
            <div className="shrink-0">
              <ContractStatusBadge status={contract.status} />
            </div>
            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[var(--color-text-faint)] group-hover:text-[var(--color-text-primary)] group-hover:translate-x-0.5 transition-all duration-150" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
