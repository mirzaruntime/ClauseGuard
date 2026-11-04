import { parseAiAnalysis } from '../../src/services/ai/ai.schema';

const validPayload = {
  contractSummary: 'A services agreement between two parties.',
  parties: ['Acme Ltd', 'Globex Inc'],
  obligations: [
    {
      title: 'Provide monthly report',
      description: 'Supplier must deliver a written report each month.',
      sourceClause: 'The Supplier shall deliver a written report each month.',
      deadline: '2026-01-31',
      noticePeriod: null,
      conditions: ['Applies while the agreement is in force'],
      confidence: 0.82,
      explanation: 'A recurring reporting duty with a contractual date.',
    },
  ],
};

describe('AI output validation', () => {
  it('accepts a well-formed payload', () => {
    const result = parseAiAnalysis(validPayload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.obligations).toHaveLength(1);
      expect(result.data.obligations[0]?.confidence).toBeCloseTo(0.82);
    }
  });

  it('rejects an obligation with a missing title', () => {
    const result = parseAiAnalysis({
      ...validPayload,
      obligations: [{ ...validPayload.obligations[0], title: '' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects a confidence value outside 0-1', () => {
    const result = parseAiAnalysis({
      ...validPayload,
      obligations: [{ ...validPayload.obligations[0], confidence: 7 }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects a non-date deadline', () => {
    const result = parseAiAnalysis({
      ...validPayload,
      obligations: [{ ...validPayload.obligations[0], deadline: 'sometime next spring' }],
    });
    expect(result.success).toBe(false);
  });

  it('normalises placeholder strings to null', () => {
    const result = parseAiAnalysis({
      ...validPayload,
      obligations: [{ ...validPayload.obligations[0], deadline: 'N/A', noticePeriod: '  ' }],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.obligations[0]?.deadline).toBeNull();
      expect(result.data.obligations[0]?.noticePeriod).toBeNull();
    }
  });

  it('rejects an entirely wrong shape', () => {
    expect(parseAiAnalysis({ obligations: 'lots of them' }).success).toBe(false);
    expect(parseAiAnalysis(null).success).toBe(false);
    expect(parseAiAnalysis('just a string').success).toBe(false);
  });

  it('defaults an absent obligations array to empty rather than failing', () => {
    const result = parseAiAnalysis({ contractSummary: 'Nothing found.', parties: [] });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.obligations).toEqual([]);
  });
});
