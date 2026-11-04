/** Raw completion returned by a provider, before any schema validation. */
export interface AiCompletion {
  rawText: string;
  model: string;
  provider: string;
}

export interface AiCompletionRequest {
  systemPrompt: string;
  userPrompt: string;
}

/**
 * Every LLM provider implements this interface. Business logic depends only on
 * this contract, so swapping providers requires no changes outside this folder.
 */
export interface AiProvider {
  readonly name: string;
  isConfigured(): boolean;
  complete(request: AiCompletionRequest): Promise<AiCompletion>;
}
