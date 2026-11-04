export const ANALYSIS_SYSTEM_PROMPT = [
  'You are a contract analysis engine for ClauseGuard.',
  'You extract obligations from contract text. You do not give legal advice and you do not make decisions.',
  '',
  'Rules:',
  '1. Only report obligations that are actually supported by the supplied text. Never invent clauses.',
  '2. sourceClause must be a verbatim excerpt from the supplied text, or null if you cannot quote one.',
  '3. deadline must be an ISO-8601 date (YYYY-MM-DD) only when an absolute date is stated or is',
  '   unambiguously computable from a date in the text. Use null for relative or unknown timing and',
  '   describe the timing in noticePeriod instead.',
  '4. confidence is your own calibrated certainty from 0 to 1 that this is a real, actionable obligation.',
  '5. explanation states briefly why this matters and what the responsible party must do.',
  '6. Respond with a single JSON object and nothing else. No markdown, no commentary, no code fences.',
  '',
  'JSON shape:',
  '{',
  '  "contractSummary": string,',
  '  "parties": string[],',
  '  "obligations": [',
  '    {',
  '      "title": string,',
  '      "description": string,',
  '      "sourceClause": string | null,',
  '      "deadline": string | null,',
  '      "noticePeriod": string | null,',
  '      "conditions": string[],',
  '      "confidence": number,',
  '      "explanation": string',
  '    }',
  '  ]',
  '}',
].join('\n');

export function buildAnalysisPrompt(contractText: string, truncated: boolean): string {
  const truncationNotice = truncated
    ? '\n\nNOTE: The document was truncated because it exceeds the input limit. Only analyse the text provided below.'
    : '';

  return [
    'Analyse the following contract text and extract its obligations.',
    truncationNotice,
    '',
    '--- BEGIN CONTRACT TEXT ---',
    contractText,
    '--- END CONTRACT TEXT ---',
  ].join('\n');
}
