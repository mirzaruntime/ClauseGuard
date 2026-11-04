import axios, { AxiosError, type AxiosInstance } from 'axios';
import { GroqProvider } from '../../src/services/ai/groq.provider';

describe('GroqProvider', () => {
  const dummyApiKey = 'gsk_test_api_key_12345';
  const dummyModel = 'llama-3.3-70b-versatile';

  describe('isConfigured', () => {
    it('returns true when a non-empty API key is provided', () => {
      const provider = new GroqProvider(dummyApiKey, dummyModel);
      expect(provider.isConfigured()).toBe(true);
    });

    it('returns false when API key is undefined', () => {
      const provider = new GroqProvider(undefined, dummyModel);
      expect(provider.isConfigured()).toBe(false);
    });

    it('returns false when API key is empty or whitespace', () => {
      expect(new GroqProvider('', dummyModel).isConfigured()).toBe(false);
      expect(new GroqProvider('   ', dummyModel).isConfigured()).toBe(false);
    });
  });

  describe('complete', () => {
    let mockPost: jest.Mock;

    beforeEach(() => {
      mockPost = jest.fn();
      jest.spyOn(axios, 'create').mockReturnValue({
        post: mockPost,
      } as unknown as AxiosInstance);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('throws AI_NOT_CONFIGURED when provider is unconfigured', async () => {
      const provider = new GroqProvider(undefined, dummyModel);

      await expect(
        provider.complete({
          systemPrompt: 'System instructions',
          userPrompt: 'Analyze this contract',
        }),
      ).rejects.toMatchObject({
        code: 'AI_NOT_CONFIGURED',
        statusCode: 503,
      });

      expect(mockPost).not.toHaveBeenCalled();
    });

    it('sends correct headers, body, and returns AiCompletion on success', async () => {
      const sampleJson = JSON.stringify({
        contractSummary: 'NDA between Acme and Beta',
        parties: ['Acme', 'Beta'],
        obligations: [],
      });

      mockPost.mockResolvedValueOnce({
        data: {
          id: 'chatcmpl-test-id',
          model: dummyModel,
          choices: [
            {
              index: 0,
              message: {
                role: 'assistant',
                content: sampleJson,
              },
              finish_reason: 'stop',
            },
          ],
        },
      });

      const provider = new GroqProvider(dummyApiKey, dummyModel);
      const result = await provider.complete({
        systemPrompt: 'You are a contract analysis engine.',
        userPrompt: 'Contract text to analyse',
      });

      expect(mockPost).toHaveBeenCalledTimes(1);
      expect(mockPost).toHaveBeenCalledWith(
        '/chat/completions',
        {
          model: dummyModel,
          messages: [
            { role: 'system', content: 'You are a contract analysis engine.' },
            { role: 'user', content: 'Contract text to analyse' },
          ],
          temperature: 0.1,
          response_format: { type: 'json_object' },
        },
        {
          headers: {
            Authorization: `Bearer ${dummyApiKey}`,
          },
        },
      );

      expect(result).toEqual({
        rawText: sampleJson,
        model: dummyModel,
        provider: 'groq',
      });
    });

    it('throws AI_EMPTY_RESPONSE when response choices array is empty', async () => {
      mockPost.mockResolvedValueOnce({
        data: {
          id: 'chatcmpl-test-id',
          choices: [],
        },
      });

      const provider = new GroqProvider(dummyApiKey, dummyModel);

      await expect(
        provider.complete({
          systemPrompt: 'Sys',
          userPrompt: 'User',
        }),
      ).rejects.toMatchObject({
        code: 'AI_EMPTY_RESPONSE',
        statusCode: 503,
      });
    });

    it('throws AI_EMPTY_RESPONSE when assistant content is empty or whitespace', async () => {
      mockPost.mockResolvedValueOnce({
        data: {
          id: 'chatcmpl-test-id',
          choices: [{ message: { content: '   ' } }],
        },
      });

      const provider = new GroqProvider(dummyApiKey, dummyModel);

      await expect(
        provider.complete({
          systemPrompt: 'Sys',
          userPrompt: 'User',
        }),
      ).rejects.toMatchObject({
        code: 'AI_EMPTY_RESPONSE',
        statusCode: 503,
      });
    });

    it('translates 401 authentication failure to AI_AUTH_ERROR', async () => {
      const authError = new AxiosError(
        'Request failed with status code 401',
        'ERR_BAD_REQUEST',
        undefined,
        undefined,
        {
          status: 401,
          statusText: 'Unauthorized',
          data: { error: { message: 'Invalid API Key' } },
          headers: {},
          config: {} as any,
        },
      );
      mockPost.mockRejectedValueOnce(authError);

      const provider = new GroqProvider(dummyApiKey, dummyModel);

      await expect(
        provider.complete({
          systemPrompt: 'Sys',
          userPrompt: 'User',
        }),
      ).rejects.toMatchObject({
        code: 'AI_AUTH_ERROR',
        statusCode: 503,
      });
    });

    it('translates 403 authorization failure to AI_AUTH_ERROR', async () => {
      const authError = new AxiosError(
        'Request failed with status code 403',
        'ERR_BAD_REQUEST',
        undefined,
        undefined,
        {
          status: 403,
          statusText: 'Forbidden',
          data: { error: { message: 'Permission denied' } },
          headers: {},
          config: {} as any,
        },
      );
      mockPost.mockRejectedValueOnce(authError);

      const provider = new GroqProvider(dummyApiKey, dummyModel);

      await expect(
        provider.complete({
          systemPrompt: 'Sys',
          userPrompt: 'User',
        }),
      ).rejects.toMatchObject({
        code: 'AI_AUTH_ERROR',
        statusCode: 503,
      });
    });

    it('translates 429 rate limit to AI_RATE_LIMITED', async () => {
      const rateLimitError = new AxiosError(
        'Request failed with status code 429',
        'ERR_BAD_REQUEST',
        undefined,
        undefined,
        {
          status: 429,
          statusText: 'Too Many Requests',
          data: { error: { message: 'Rate limit reached' } },
          headers: {},
          config: {} as any,
        },
      );
      mockPost.mockRejectedValueOnce(rateLimitError);

      const provider = new GroqProvider(dummyApiKey, dummyModel);

      await expect(
        provider.complete({
          systemPrompt: 'Sys',
          userPrompt: 'User',
        }),
      ).rejects.toMatchObject({
        code: 'AI_RATE_LIMITED',
        statusCode: 503,
      });
    });

    it('translates 500/502/503 server errors to AI_PROVIDER_ERROR', async () => {
      const serverError = new AxiosError(
        'Request failed with status code 500',
        'ERR_BAD_RESPONSE',
        undefined,
        undefined,
        {
          status: 500,
          statusText: 'Internal Server Error',
          data: {},
          headers: {},
          config: {} as any,
        },
      );
      mockPost.mockRejectedValueOnce(serverError);

      const provider = new GroqProvider(dummyApiKey, dummyModel);

      await expect(
        provider.complete({
          systemPrompt: 'Sys',
          userPrompt: 'User',
        }),
      ).rejects.toMatchObject({
        code: 'AI_PROVIDER_ERROR',
        statusCode: 503,
      });
    });

    it('translates ECONNABORTED timeout to AI_TIMEOUT', async () => {
      const timeoutError = new AxiosError(
        'timeout of 60000ms exceeded',
        'ECONNABORTED',
      );
      mockPost.mockRejectedValueOnce(timeoutError);

      const provider = new GroqProvider(dummyApiKey, dummyModel);

      await expect(
        provider.complete({
          systemPrompt: 'Sys',
          userPrompt: 'User',
        }),
      ).rejects.toMatchObject({
        code: 'AI_TIMEOUT',
        statusCode: 503,
      });
    });

    it('translates ETIMEDOUT network timeout to AI_TIMEOUT', async () => {
      const timeoutError = new AxiosError(
        'connect ETIMEDOUT',
        'ETIMEDOUT',
      );
      mockPost.mockRejectedValueOnce(timeoutError);

      const provider = new GroqProvider(dummyApiKey, dummyModel);

      await expect(
        provider.complete({
          systemPrompt: 'Sys',
          userPrompt: 'User',
        }),
      ).rejects.toMatchObject({
        code: 'AI_TIMEOUT',
        statusCode: 503,
      });
    });

    it('translates unexpected non-Axios error to AI_UNKNOWN_ERROR', async () => {
      mockPost.mockRejectedValueOnce(new Error('Unexpected disk/socket failure'));

      const provider = new GroqProvider(dummyApiKey, dummyModel);

      await expect(
        provider.complete({
          systemPrompt: 'Sys',
          userPrompt: 'User',
        }),
      ).rejects.toMatchObject({
        code: 'AI_UNKNOWN_ERROR',
        statusCode: 503,
      });
    });
  });
});
