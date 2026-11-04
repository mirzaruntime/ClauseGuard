import type { Request } from 'express';
import type { Types } from 'mongoose';

/** Identity attached to a request after successful JWT authentication. */
export interface AuthenticatedUser {
  id: string;
  email: string;
}

/** Express request guaranteed (by the auth middleware) to carry an authenticated user. */
export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

export interface JwtPayload {
  sub: string;
  email: string;
  /** Missing on legacy tokens; interpreted as version zero. */
  tokenVersion?: number;
  iat?: number;
  exp?: number;
}

export type ContractStatus =
  | 'uploaded'
  | 'processing'
  | 'analyzing'
  | 'review'
  | 'completed'
  | 'failed';

export type ObligationStatus =
  | 'potential'
  | 'confirmed'
  | 'rejected'
  | 'completed'
  | 'overdue';

export type ReminderStatus = 'scheduled' | 'sent' | 'cancelled' | 'failed';

export type ReminderChannel = 'log' | 'email';

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedResult<T> {
  items: T[];
  pagination: Pagination;
}

export type ObjectIdLike = Types.ObjectId | string;

/** Structured, provider-agnostic result returned by the AI analysis layer. */
export interface AiObligationCandidate {
  title: string;
  description: string;
  sourceClause: string | null;
  deadline: string | null;
  noticePeriod: string | null;
  conditions: string[];
  confidence: number;
  explanation: string;
}

export interface AiAnalysisResult {
  contractSummary: string;
  parties: string[];
  obligations: AiObligationCandidate[];
}
