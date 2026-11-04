import {
  analyzeContractText,
  createProvider,
  extractJsonPayload,
  GeminiProvider,
  GroqProvider,
  isAiConfigured,
  resetAiProvider,
  setAiProvider,
} from '../../src/services/ai';
import type { AiProvider } from '../../src/services/ai';
import { ApiError } from '../../src/utils/ApiError';

const goodResponse = JSON.stringify({
  contractSummary: 'Summary',
  parties: ['A', 'B'],
  obligations: [
    {
      title: 'Renew licence',
      description: 'Renew the licence before expiry.',
      sourceClause: 'Licensee shall renew the licence before expiry.',
      deadline: '2026-06-30',
      noticePeriod: '30 days',
      conditions: [],
      confidence: 0.9,
      explanation: 'Missing the renewal ends the licence.',
    },
  ],
});

function stubProvider(behaviour: Partial<AiProvider> & { rawText?: string }): AiProvider {
  return {
    name: 'stub',
    isConfigured: behaviour.isConfigured ?? (() => true),
    complete:
      behaviour.complete ??
      (async () => ({
        rawText: behaviour.rawText ?? goodResponse,
        model: 'stub-model',
        provider: 'stub',
      })),
  };
}

afterEach(() => resetAiProvider());

describe('extractJsonPayload', () => {
  it('parses plain JSON', () => {
    expect(extractJsonPayload('{"a":1}')).toEqual({ a: 1 });
  });

  it('parses JSON wrapped in a markdown code fence', () => {
    expect(extractJsonPayload('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  it('parses JSON surrounded by commentary', () => {
    expect(extractJsonPayload('Sure! {"a":1} Hope that helps.')).toEqual({ a: 1 });
  });

  it('throws a safe error on unparseable output', () => {
    try {
      extractJsonPayload('I am afraid I cannot do that.');
      throw new Error('expected a failure');
    } catch (error) {
      expect((error as ApiError).code).toBe('AI_MALFORMED_RESPONSE');
    }
  });
});

describe('analyzeContractText', () => {
  it('returns validated, structured obligations', async () => {
    setAiProvider(stubProvider({}));
    const result = await analyzeContractText('Some contract text');
    expect(result.obligations).toHaveLength(1);
    expect(result.obligations[0]?.title).toBe('Renew licence');
  });

  it('rejects malformed AI output instead of persisting it', async () => {
    setAiProvider(stubProvider({ rawText: 'not json at all' }));
    await expect(analyzeContractText('text')).rejects.toMatchObject({
      code: 'AI_MALFORMED_RESPONSE',
      statusCode: 503,
    });
  });

  it('rejects structurally invalid AI output', async () => {
    setAiProvider(
      stubProvider({ rawText: JSON.stringify({ obligations: [{ title: 'x' }] }) }),
    );
    await expect(analyzeContractText('text')).rejects.toMatchObject({
      code: 'AI_INVALID_RESPONSE_SHAPE',
    });
  });

  it('surfaces provider timeouts as an operational error', async () => {
    setAiProvider(
      stubProvider({
        complete: async () => {
          throw ApiError.serviceUnavailable('AI analysis timed out', 'AI_TIMEOUT');
        },
      }),
    );
    await expect(analyzeContractText('text')).rejects.toMatchObject({ code: 'AI_TIMEOUT' });
  });

  it('surfaces provider failures', async () => {
    setAiProvider(
      stubProvider({
        complete: async () => {
          throw ApiError.serviceUnavailable('upstream down', 'AI_PROVIDER_ERROR');
        },
      }),
    );
    await expect(analyzeContractText('text')).rejects.toMatchObject({
      code: 'AI_PROVIDER_ERROR',
    });
  });

  it('reports a clear error when the provider is not configured', async () => {
    setAiProvider(
      stubProvider({
        isConfigured: () => false,
        complete: async () => {
          throw ApiError.serviceUnavailable('not configured', 'AI_NOT_CONFIGURED');
        },
      }),
    );
    expect(isAiConfigured()).toBe(false);
    await expect(analyzeContractText('text')).rejects.toMatchObject({
      code: 'AI_NOT_CONFIGURED',
    });
  });

  it('refuses to analyse empty text', async () => {
    setAiProvider(stubProvider({}));
    await expect(analyzeContractText('   ')).rejects.toMatchObject({
      code: 'EMPTY_CONTRACT_TEXT',
    });
  });
});

describe('provider selection and configuration', () => {
  it('instantiates GeminiProvider for "gemini"', () => {
    const p = createProvider('gemini');
    expect(p.name).toBe('gemini');
    expect(p).toBeInstanceOf(GeminiProvider);
  });

  it('instantiates GroqProvider for "groq"', () => {
    const p = createProvider('groq');
    expect(p.name).toBe('groq');
    expect(p).toBeInstanceOf(GroqProvider);
  });

  it('defaults to GeminiProvider for unrecognized provider string', () => {
    const p = createProvider('other' as any);
    expect(p.name).toBe('gemini');
    expect(p).toBeInstanceOf(GeminiProvider);
  });

  it('reports the provider as unconfigured without an API key', () => {
    setAiProvider(new GeminiProvider(undefined));
    expect(isAiConfigured()).toBe(false);

    setAiProvider(new GeminiProvider(''));
    expect(isAiConfigured()).toBe(false);

    setAiProvider(new GroqProvider(undefined));
    expect(isAiConfigured()).toBe(false);

    setAiProvider(new GroqProvider(''));
    expect(isAiConfigured()).toBe(false);
  });
});
