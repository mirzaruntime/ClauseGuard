import { env } from '../../config/env';
import { ApiError } from '../../utils/ApiError';
import { logger } from '../../utils/logger';
import type { AiAnalysisResult } from '../../types';
import { parseAiAnalysis } from './ai.schema';
import { ANALYSIS_SYSTEM_PROMPT, buildAnalysisPrompt } from './prompt';
import { GeminiProvider } from './gemini.provider';
import { GroqProvider } from './groq.provider';
import type { AiProvider } from './provider.interface';

export const AI_DISCLAIMER =
  'AI-generated analysis is an assistive extraction layer, not legal advice. Every obligation requires human review.';

export function createProvider(providerName: string = env.AI_PROVIDER): AiProvider {
  switch (providerName) {
    case 'groq':
      return new GroqProvider();
    case 'gemini':
    default:
      return new GeminiProvider();
  }
}

let provider: AiProvider = createProvider();

/** Test seam: allows a stub provider to be injected without touching callers. */
export function setAiProvider(next: AiProvider): void {
  provider = next;
}

export function resetAiProvider(): void {
  provider = createProvider();
}

export function isAiConfigured(): boolean {
  return provider.isConfigured();
}

/** Strips code fences some models add despite JSON response instructions. */
export function extractJsonPayload(rawText: string): unknown {
  const cleaned = rawText
    .replace(/^\s*```(?:json)?/i, '')
    .replace(/```\s*$/, '')
    .trim();

  const candidates = [cleaned];
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    candidates.push(cleaned.slice(firstBrace, lastBrace + 1));
  }

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      continue;
    }
  }

  throw ApiError.serviceUnavailable(
    'The AI provider returned a response that could not be parsed',
    'AI_MALFORMED_RESPONSE',
  );
}

/**
 * Sends contract text to the configured provider and returns a validated,
 * structured result. Nothing unvalidated escapes this function.
 */
export async function analyzeContractText(
  contractText: string,
  options: { truncated?: boolean } = {},
): Promise<AiAnalysisResult> {
  if (!contractText.trim()) {
    throw ApiError.badRequest('Cannot analyse empty contract text', 'EMPTY_CONTRACT_TEXT');
  }

  const completion = await provider.complete({
    systemPrompt: ANALYSIS_SYSTEM_PROMPT,
    userPrompt: buildAnalysisPrompt(contractText, options.truncated ?? false),
  });

  const payload = extractJsonPayload(completion.rawText);
  const parsed = parseAiAnalysis(payload);

  if (!parsed.success) {
    logger.warn('AI response failed schema validation', {
      provider: completion.provider,
      model: completion.model,
      issues: parsed.issues.slice(0, 10),
    });
    throw ApiError.serviceUnavailable(
      'The AI provider returned data in an unexpected shape',
      'AI_INVALID_RESPONSE_SHAPE',
    );
  }

  logger.info('AI analysis completed', {
    provider: completion.provider,
    model: completion.model,
    obligationCount: parsed.data.obligations.length,
  });

  return parsed.data;
}
