import { z } from 'zod';
import type { AiAnalysisResult } from '../../types';

const nullableString = z
  .union([z.string(), z.null()])
  .transform((value) => {
    if (value === null) return null;
    const trimmed = value.trim();
    if (trimmed === '' || /^(null|n\/a|none|unknown)$/i.test(trimmed)) return null;
    return trimmed;
  });

const deadlineSchema = nullableString.refine(
  (value) => value === null || !Number.isNaN(new Date(value).getTime()),
  { message: 'deadline must be an ISO date or null' },
);

const obligationSchema = z.object({
  title: z.string().trim().min(1).max(250),
  description: z.string().trim().min(1).max(5000),
  sourceClause: nullableString.default(null).transform((value) => value?.slice(0, 10_000) ?? null),
  deadline: deadlineSchema.default(null),
  noticePeriod: nullableString.default(null).transform((value) => value?.slice(0, 250) ?? null),
  conditions: z
    .array(z.string().trim().min(1).max(500))
    .max(50)
    .default([])
    .catch([]),
  confidence: z.coerce.number().min(0).max(1),
  explanation: z.string().trim().min(1).max(5000),
});

/**
 * Contract for model output. Anything that does not satisfy this schema is
 * rejected before it can reach the database - arbitrary model text is never
 * trusted as structured data.
 */
export const aiAnalysisSchema = z.object({
  contractSummary: z.string().trim().max(5000).default(''),
  parties: z.array(z.string().trim().min(1).max(250)).max(50).default([]).catch([]),
  obligations: z.array(obligationSchema).max(200).default([]),
});

export type ParsedAiAnalysis = AiAnalysisResult;

export function parseAiAnalysis(input: unknown): {
  success: true;
  data: AiAnalysisResult;
} | {
  success: false;
  issues: { field: string; message: string }[];
} {
  const result = aiAnalysisSchema.safeParse(input);
  if (!result.success) {
    return {
      success: false,
      issues: result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    };
  }
  return { success: true, data: result.data };
}
