import axios, { AxiosError, type AxiosInstance } from 'axios';
import { env } from '../../config/env';
import { ApiError } from '../../utils/ApiError';
import { logger } from '../../utils/logger';
import type { AiCompletion, AiCompletionRequest, AiProvider } from './provider.interface';

interface GeminiPart {
  text?: string;
}

interface GeminiResponse {
  candidates?: {
    content?: { parts?: GeminiPart[] };
    finishReason?: string;
  }[];
  promptFeedback?: { blockReason?: string };
}

/**
 * Google Gemini provider. The API key is read from the environment only and is
 * sent as a header (never in a URL or a log line).
 */
export class GeminiProvider implements AiProvider {
  public readonly name = 'gemini';
  private readonly apiKey: string | undefined;
  private readonly client: AxiosInstance;

  constructor(apiKey?: string) {
    this.apiKey = arguments.length > 0 ? apiKey : env.GEMINI_API_KEY;
    this.client = axios.create({
      baseURL: env.GEMINI_API_BASE_URL,
      timeout: env.AI_REQUEST_TIMEOUT_MS,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  isConfigured(): boolean {
    return typeof this.apiKey === 'string' && this.apiKey.trim().length > 0;
  }

  async complete(request: AiCompletionRequest): Promise<AiCompletion> {
    if (!this.isConfigured()) {
      throw ApiError.serviceUnavailable(
        'AI analysis is not configured on this server',
        'AI_NOT_CONFIGURED',
      );
    }

    const url = `/v1beta/models/${encodeURIComponent(env.GEMINI_MODEL)}:generateContent`;

    try {
      const { data } = await this.client.post<GeminiResponse>(
        url,
        {
          systemInstruction: { parts: [{ text: request.systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: request.userPrompt }] }],
          generationConfig: {
            temperature: 0.1,
            topP: 0.8,
            maxOutputTokens: 8192,
            responseMimeType: 'application/json',
          },
        },
        { headers: { 'x-goog-api-key': this.apiKey as string } },
      );

      const blockReason = data.promptFeedback?.blockReason;
      if (blockReason) {
        throw ApiError.serviceUnavailable(
          'The AI provider declined to analyse this document',
          'AI_CONTENT_BLOCKED',
        );
      }

      const rawText = (data.candidates?.[0]?.content?.parts ?? [])
        .map((part) => part.text ?? '')
        .join('')
        .trim();

      if (!rawText) {
        throw ApiError.serviceUnavailable(
          'The AI provider returned an empty response',
          'AI_EMPTY_RESPONSE',
        );
      }

      return { rawText, model: env.GEMINI_MODEL, provider: this.name };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw this.translateError(error);
    }
  }

  private translateError(error: unknown): ApiError {
    if (!axios.isAxiosError(error)) {
      logger.error('Unexpected AI provider failure', {
        error: error instanceof Error ? error : new Error(String(error)),
      });
      return ApiError.serviceUnavailable('AI analysis failed unexpectedly', 'AI_UNKNOWN_ERROR');
    }

    const axiosError = error as AxiosError;
    const status = axiosError.response?.status;

    if (axiosError.code === 'ECONNABORTED' || axiosError.code === 'ETIMEDOUT') {
      logger.warn('AI provider request timed out', { timeoutMs: env.AI_REQUEST_TIMEOUT_MS });
      return ApiError.serviceUnavailable('AI analysis timed out', 'AI_TIMEOUT');
    }

    if (status === 401 || status === 403) {
      logger.error('AI provider rejected credentials', { status });
      return ApiError.serviceUnavailable(
        'AI analysis is misconfigured on this server',
        'AI_AUTH_ERROR',
      );
    }

    if (status === 429) {
      logger.warn('AI provider rate limit reached', { status });
      return ApiError.serviceUnavailable(
        'AI analysis is temporarily rate limited. Please retry shortly.',
        'AI_RATE_LIMITED',
      );
    }

    logger.error('AI provider request failed', { status, code: axiosError.code });
    return ApiError.serviceUnavailable('AI analysis is temporarily unavailable', 'AI_PROVIDER_ERROR');
  }
}
