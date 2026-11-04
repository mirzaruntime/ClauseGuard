/**
 * Types mirror the ClauseGuard backend exactly (models, validators, response
 * envelope). Field names, enums and nullability all match the backend source.
 */

export interface ApiSuccess<T> {
  success: true;
  data: T;
  message?: string;
  pagination?: Pagination;
}

export interface ApiError {
  success: false;
  message: string;
  code?: string;
  details?: { field: string; message: string }[] | unknown;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResult {
  user: User;
  token: string;
  tokenType: 'Bearer';
}

export type ContractStatus =
  | 'uploaded'
  | 'processing'
  | 'analyzing'
  | 'review'
  | 'completed'
  | 'failed';

export interface ContractProcessingError {
  stage: 'extraction' | 'analysis' | 'persistence';
  code: string;
  message: string;
  occurredAt: string;
}

export interface Contract {
  id: string;
  ownerId: string;
  title: string;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
  checksum: string;
  status: ContractStatus;
  pageCount?: number;
  extractedTextLength?: number;
  textTruncated: boolean;
  contractSummary?: string;
  parties: string[];
  obligationCount: number;
  analyzedAt?: string;
  processingError: ContractProcessingError | null;
  createdAt: string;
  updatedAt: string;
}

export type ObligationStatus = 'potential' | 'confirmed' | 'rejected' | 'completed' | 'overdue';

export interface Obligation {
  id: string;
  contractId: string;
  ownerId: string;
  title: string;
  description: string;
  status: ObligationStatus;
  sourceClause: string | null;
  deadline: string | null;
  noticePeriod: string | null;
  conditions: string[];
  confidence: number | null;
  aiExplanation: string | null;
  aiGenerated: boolean;
  editedByUser: boolean;
  reviewedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ReminderStatus = 'scheduled' | 'sent' | 'cancelled' | 'failed';
export type ReminderChannel = 'log' | 'email';

export interface Reminder {
  id: string;
  obligationId: string;
  contractId: string;
  ownerId: string;
  reminderDate: string;
  status: ReminderStatus;
  channel: ReminderChannel;
  message: string | null;
  claimedAt: string | null;
  sentAt: string | null;
  attempts: number;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ObligationStats {
  potential?: number;
  confirmed?: number;
  rejected?: number;
  completed?: number;
  overdue?: number;
}

export interface HealthReadiness {
  database: string;
  aiConfigured: boolean;
  uptimeSeconds: number;
}

/** Request payload shapes — mirror the backend Zod validators exactly. */
export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}
export interface LoginRequest {
  email: string;
  password: string;
}
export interface UpdateProfileRequest {
  name?: string;
}
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}
export interface ListContractsRequest {
  page?: number;
  limit?: number;
  status?: ContractStatus;
  search?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'title' | 'status';
  sortOrder?: 'asc' | 'desc';
}
export interface ListObligationsRequest {
  page?: number;
  limit?: number;
  status?: ObligationStatus;
  contractId?: string;
  dueBefore?: string;
  dueAfter?: string;
  search?: string;
  sortBy?: 'deadline' | 'createdAt' | 'confidence' | 'status';
  sortOrder?: 'asc' | 'desc';
}
export interface UpdateObligationRequest {
  title?: string;
  description?: string;
  status?: ObligationStatus;
  deadline?: string | null;
  noticePeriod?: string | null;
  conditions?: string[];
}
export interface CreateReminderRequest {
  obligationId: string;
  reminderDate: string;
  channel?: ReminderChannel;
  message?: string;
}
export interface ListRemindersRequest {
  page?: number;
  limit?: number;
  status?: ReminderStatus;
  obligationId?: string;
  sortBy?: 'reminderDate' | 'createdAt' | 'status';
  sortOrder?: 'asc' | 'desc';
}
export interface UpdateReminderRequest {
  reminderDate?: string;
  message?: string | null;
  status?: 'scheduled' | 'cancelled';
  channel?: ReminderChannel;
}
