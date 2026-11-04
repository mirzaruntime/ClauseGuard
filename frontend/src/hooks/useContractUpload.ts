import { useCallback, useEffect, useRef, useState } from 'react';
import { contractsApi, ApiRequestError } from '@/api';
import type { Contract } from '@/types/api';

export type UploadPhase =
  | 'idle'
  | 'validating'
  | 'uploading'
  | 'processing'
  | 'analyzing'
  | 'review'
  | 'completed'
  | 'error';

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // Matches backend default MAX_FILE_SIZE.
const POLL_INTERVAL_MS = 1500;
const POLL_TIMEOUT_MS = 90_000;

function phaseFromStatus(status: Contract['status']): UploadPhase {
  switch (status) {
    case 'uploaded':
      return 'uploading';
    case 'processing':
      return 'processing';
    case 'analyzing':
      return 'analyzing';
    case 'review':
      return 'review';
    case 'completed':
      return 'completed';
    case 'failed':
      return 'error';
    default:
      return 'uploading';
  }
}

/** Validates a file against the same rules the backend enforces before ever sending it. */
export function validateFile(file: File): string | null {
  const isPdfType = file.type === 'application/pdf';
  const isPdfExtension = file.name.toLowerCase().endsWith('.pdf');
  if (!isPdfType && !isPdfExtension) return 'Only PDF files are accepted.';
  if (file.size === 0) return 'This file is empty.';
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `This file exceeds the ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB limit.`;
  }
  return null;
}

/**
 * Drives the upload -> processing -> AI analysis flow. Upload progress comes
 * from a real XHR progress event; processing/analysis status is polled from
 * the actual contract record — nothing here is a simulated percentage.
 */
export function useContractUpload() {
  const [phase, setPhase] = useState<UploadPhase>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [contract, setContract] = useState<Contract | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Holds the latest pollContract implementation so the recursive call inside
  // the timeout callback goes through a stable ref instead of closing over
  // the `pollContract` binding being declared (which the linter correctly
  // flags as accessed-before-declared, since useCallback's returned identity
  // can change across renders).
  const pollContractRef = useRef<(contractId: string, startedAt: number) => void>(() => {});

  const stopPolling = useCallback(() => {
    if (pollTimer.current) {
      clearTimeout(pollTimer.current);
      pollTimer.current = null;
    }
  }, []);

  const pollContract = useCallback(
    (contractId: string, startedAt: number) => {
      stopPolling();
      pollTimer.current = setTimeout(async () => {
        try {
          const { contract: latest } = await contractsApi.getById(contractId);
          setContract(latest);

          if (latest.status === 'review' || latest.status === 'completed') {
            setPhase(phaseFromStatus(latest.status));
            return;
          }
          if (latest.status === 'failed') {
            setPhase('error');
            setErrorMessage(latest.processingError?.message ?? 'Contract analysis failed.');
            return;
          }
          if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
            setPhase('error');
            setErrorMessage('Analysis is taking longer than expected. Check back on the contract page shortly.');
            return;
          }
          setPhase(phaseFromStatus(latest.status));
          pollContractRef.current(contractId, startedAt);
        } catch (error) {
          setPhase('error');
          setErrorMessage(
            error instanceof ApiRequestError ? error.message : 'Could not check processing status.',
          );
        }
      }, POLL_INTERVAL_MS);
    },
    [stopPolling],
  );
  useEffect(() => {
    pollContractRef.current = pollContract;
  }, [pollContract]);

  const upload = useCallback(
    async (file: File, title?: string) => {
      const validationError = validateFile(file);
      setPhase('validating');
      setErrorMessage(null);
      setUploadProgress(0);

      if (validationError) {
        setPhase('error');
        setErrorMessage(validationError);
        return;
      }

      setPhase('uploading');
      try {
        const result = await contractsApi.upload(file, title, setUploadProgress);
        setContract(result.contract);
        setPhase(phaseFromStatus(result.contract.status));
        pollContract(result.contract.id, Date.now());
      } catch (error) {
        setPhase('error');
        setErrorMessage(
          error instanceof ApiRequestError ? error.message : 'Upload failed. Please try again.',
        );
      }
    },
    [pollContract],
  );

  const reset = useCallback(() => {
    stopPolling();
    setPhase('idle');
    setUploadProgress(0);
    setContract(null);
    setErrorMessage(null);
  }, [stopPolling]);

  return { phase, uploadProgress, contract, errorMessage, upload, reset };
}
