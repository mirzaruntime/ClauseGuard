import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Sparkles, ShieldCheck, FileCheck } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Label } from '@/components/ui/Label';
import { Input } from '@/components/ui/Input';
import { FileDropzone } from '@/components/contracts/FileDropzone';
import { UploadStatusPanel } from '@/components/contracts/UploadStatusPanel';
import { InlineError } from '@/components/shared/InlineError';
import { useContractUpload, validateFile } from '@/hooks/useContractUpload';

import { PageTransition, PageHeaderReveal, FadeUp } from '@/components/shared/Motion';

export function ContractUploadPage() {
  const navigate = useNavigate();
  const { phase, uploadProgress, contract, errorMessage, upload, reset } = useContractUpload();

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [selectError, setSelectError] = useState<string | null>(null);

  const isBusy = phase !== 'idle' && phase !== 'error';

  const handleFileSelected = (selected: File) => {
    const validationError = validateFile(selected);
    setSelectError(validationError);
    setFile(selected);
    if (!validationError) {
      void upload(selected, title.trim() || undefined);
    }
  };

  const handleRetry = () => {
    if (file) void upload(file, title.trim() || undefined);
  };

  const handleReset = () => {
    reset();
    setFile(null);
    setTitle('');
    setSelectError(null);
  };

  const handleGoToContract = () => {
    if (contract) navigate(`/contracts/${contract.id}`);
  };

  return (
    <PageTransition className="mx-auto max-w-2xl space-y-5 sm:space-y-6">
      <FadeUp delay={0.02}>
        <Link
          to="/contracts"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors w-fit"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Contracts
        </Link>
      </FadeUp>

      <PageHeaderReveal>
        <PageHeader
          title="Upload Contract Document"
          description="Ingest contracts for automated clause extraction, party detection, and obligation structuring."
        />
      </PageHeaderReveal>

      {phase === 'idle' && (
        <div className="space-y-6">
          <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 sm:p-8 shadow-[var(--shadow-xs)] space-y-5">
            <div>
              <Label htmlFor="upload-title" className="text-xs font-semibold text-[var(--color-text-primary)]">
                Contract Title (Optional)
              </Label>
              <p className="text-[11px] text-[var(--color-text-faint)] mb-1.5">
                Leave blank to automatically use the file name as the title.
              </p>
              <Input
                id="upload-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Master Services Agreement 2026 - Acme Corp"
                className="mt-1"
              />
            </div>

            <FileDropzone onFileSelected={handleFileSelected} disabled={isBusy} />
            {selectError && <InlineError message={selectError} />}
          </div>

          {/* Enterprise pipeline guarantees */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex items-start gap-2.5 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5">
              <FileCheck className="h-4 w-4 text-[var(--color-text-primary)] shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-[var(--color-text-primary)]">Strict Ingestion</p>
                <p className="text-[11px] text-[var(--color-text-muted)]">Encrypted PDF parsing</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5">
              <Sparkles className="h-4 w-4 text-[var(--color-orange-text)] shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-[var(--color-text-primary)]">Clause Extraction</p>
                <p className="text-[11px] text-[var(--color-text-muted)]">AI identifies obligations</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5">
              <ShieldCheck className="h-4 w-4 text-[var(--color-success)] shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-[var(--color-text-primary)]">Human Approval</p>
                <p className="text-[11px] text-[var(--color-text-muted)]">You confirm each item</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {phase !== 'idle' && (
        <FadeUp delay={0.08}>
          <UploadStatusPanel
            phase={phase}
            uploadProgress={uploadProgress}
            file={file}
            contract={contract}
            errorMessage={errorMessage}
            onRetry={handleRetry}
            onReset={handleReset}
            onGoToContract={handleGoToContract}
          />
        </FadeUp>
      )}
    </PageTransition>
  );
}
