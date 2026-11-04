import axios, { AxiosError, type AxiosInstance } from 'axios';
import { env } from '../../config/env';
import { ApiError } from '../../utils/ApiError';
import { logger } from '../../utils/logger';
import type { AiCompletion, AiCompletionRequest, AiProvider } from './provider.interface';

interface GroqChatCompletionResponse {
  id?: string;
  model?: string;
  choices?: {
    index?: number;
    message?: {
      role?: string;
      content?: string | null;
    };
    finish_reason?: string;
  }[];
}

/**
 * Groq provider using Groq's OpenAI-compatible Chat Completions API.
 * The API key is read from the environment only and is sent as a Bearer
 * token in the Authorization header (never in a URL or log line).
 */
export class GroqProvider implements AiProvider {
  public readonly name = 'groq';
  private readonly apiKey: string | undefined;
  private readonly client: AxiosInstance;

  constructor(
    apiKey?: string,
    private readonly model: string = env.GROQ_MODEL,
    baseURL: string = env.GROQ_API_BASE_URL,
    timeoutMs: number = env.AI_REQUEST_TIMEOUT_MS,
  ) {
    this.apiKey = arguments.length > 0 ? apiKey : env.GROQ_API_KEY;
    this.client = axios.create({
      baseURL,
      timeout: timeoutMs,
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

    try {
      const { data } = await this.client.post<GroqChatCompletionResponse>(
        '/chat/completions',
        {
          model: this.model,
          messages: [
            { role: 'system', content: request.systemPrompt },
            { role: 'user', content: request.userPrompt },
          ],
          temperature: 0.1,
          response_format: { type: 'json_object' },
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        },
      );

      const rawText = data.choices?.[0]?.message?.content?.trim();

      if (!rawText) {
        throw ApiError.serviceUnavailable(
          'The AI provider returned an empty response',
          'AI_EMPTY_RESPONSE',
        );
      }

      return {
        rawText,
        model: data.model ?? this.model,
        provider: this.name,
      };
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
