import { Contract } from '../models/Contract';
import { Obligation } from '../models/Obligation';
import { ApiError } from '../utils/ApiError';
import { logger } from '../utils/logger';
import { parseIsoDate } from '../utils/date';
import type { AiAnalysisResult, ContractStatus } from '../types';
import { readDocument } from './document.service';
import { extractPdfText } from './pdf.service';
import { analyzeContractText, isAiConfigured } from './ai';

type Stage = 'extraction' | 'analysis' | 'persistence';

async function setStatus(contractId: string, status: ContractStatus): Promise<void> {
  await Contract.updateOne({ _id: contractId }, { $set: { status } });
}

async function recordFailure(contractId: string, stage: Stage, error: unknown): Promise<void> {
  const apiError = error instanceof ApiError ? error : null;
  await Contract.updateOne(
    { _id: contractId },
    {
      $set: {
        status: 'failed',
        processingError: {
          stage,
          code: apiError?.code ?? 'PROCESSING_FAILED',
          // Safe message only - never the raw contract content or a stack trace.
          message: apiError?.message ?? 'Contract processing failed',
          occurredAt: new Date(),
        },
      },
    },
  );

  logger.error('contract.processing_failed', {
    contractId,
    stage,
    code: apiError?.code ?? 'PROCESSING_FAILED',
    error: error instanceof Error ? error : new Error(String(error)),
  });
}

/** Persists AI suggestions as `potential` obligations awaiting human review. */
async function persistObligations(
  contractId: string,
  ownerId: string,
  analysis: AiAnalysisResult,
): Promise<number> {
  if (analysis.obligations.length === 0) return 0;

  const documents = analysis.obligations.map((candidate) => ({
    contractId,
    ownerId,
    title: candidate.title,
    description: candidate.description,
    // AI output is never auto-confirmed.
    status: 'potential' as const,
    sourceClause: candidate.sourceClause,
    deadline: candidate.deadline ? parseIsoDate(candidate.deadline) : null,
    noticePeriod: candidate.noticePeriod,
    conditions: candidate.conditions,
    confidence: candidate.confidence,
    aiExplanation: candidate.explanation,
    aiGenerated: true,
    editedByUser: false,
  }));

  const created = await Obligation.insertMany(documents, { ordered: false });
  return created.length;
}

/**
 * Full analysis pipeline for one contract:
 * read file -> extract text -> normalise -> AI -> validate -> persist -> review.
 *
 * Each stage updates the contract status so clients can poll progress, and any
 * failure is recorded on the contract rather than thrown into the request cycle.
 */
export async function processContract(contractId: string): Promise<void> {
  const contract = await Contract.findById(contractId);
  if (!contract) {
    logger.warn('contract.processing_skipped_missing', { contractId });
    return;
  }

  const ownerId = String(contract.ownerId);

  if (!isAiConfigured()) {
    await recordFailure(
      contractId,
      'analysis',
      ApiError.serviceUnavailable(
        'AI analysis is not configured on this server',
        'AI_NOT_CONFIGURED',
      ),
    );
    return;
  }

  let extractedText: string;
  let truncated = false;

  try {
    await setStatus(contractId, 'processing');
    const buffer = await readDocument(contract.fileReference);
    const extracted = await extractPdfText(buffer);

    extractedText = extracted.text;
    truncated = extracted.truncated;

    await Contract.updateOne(
      { _id: contractId },
      {
        $set: {
          pageCount: extracted.pageCount,
          extractedTextLength: extracted.characterCount,
          textTruncated: extracted.truncated,
          processingError: null,
        },
      },
    );
  } catch (error) {
    await recordFailure(contractId, 'extraction', error);
    return;
  }

  let analysis: AiAnalysisResult;
  try {
    await setStatus(contractId, 'analyzing');
    analysis = await analyzeContractText(extractedText, { truncated });
  } catch (error) {
    await recordFailure(contractId, 'analysis', error);
    return;
  }

  try {
    const obligationCount = await persistObligations(contractId, ownerId, analysis);

    await Contract.updateOne(
      { _id: contractId },
      {
        $set: {
          // Human review is always the next step; never `completed` automatically.
          status: 'review',
          contractSummary: analysis.contractSummary,
          parties: analysis.parties,
          obligationCount,
          analyzedAt: new Date(),
          processingError: null,
        },
      },
    );

    logger.info('contract.processed', { contractId, obligationCount });
  } catch (error) {
    await recordFailure(contractId, 'persistence', error);
  }
}

/**
 * Hands processing off the HTTP request cycle.
 *
 * This is the single seam where a real queue (BullMQ, SQS, ...) would be
 * introduced: replace this body with a job enqueue and nothing else changes.
 */
export function enqueueContractProcessing(contractId: string): void {
  setImmediate(() => {
    processContract(contractId).catch((error: unknown) => {
      logger.error('contract.processing_unhandled', {
        contractId,
        error: error instanceof Error ? error : new Error(String(error)),
      });
    });
  });
}
