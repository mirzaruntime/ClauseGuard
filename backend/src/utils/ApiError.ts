/** Application-level error carrying an HTTP status and a safe, machine-readable code. */
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;
  public readonly isOperational = true;

  constructor(statusCode: number, message: string, code: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, ApiError);
  }

  static badRequest(message: string, code = 'BAD_REQUEST', details?: unknown): ApiError {
    return new ApiError(400, message, code, details);
  }

  static validation(message = 'Request validation failed', details?: unknown): ApiError {
    return new ApiError(422, message, 'VALIDATION_ERROR', details);
  }

  static unauthorized(message = 'Authentication required', code = 'UNAUTHORIZED'): ApiError {
    return new ApiError(401, message, code);
  }

  static forbidden(message = 'You do not have access to this resource', code = 'FORBIDDEN'): ApiError {
    return new ApiError(403, message, code);
  }

  static notFound(message = 'Resource not found', code = 'NOT_FOUND'): ApiError {
    return new ApiError(404, message, code);
  }

  static conflict(message: string, code = 'CONFLICT'): ApiError {
    return new ApiError(409, message, code);
  }

  static payloadTooLarge(message: string, code = 'PAYLOAD_TOO_LARGE'): ApiError {
    return new ApiError(413, message, code);
  }

  static unsupportedMediaType(message: string, code = 'UNSUPPORTED_MEDIA_TYPE'): ApiError {
    return new ApiError(415, message, code);
  }

  static tooManyRequests(message = 'Too many requests', code = 'RATE_LIMITED'): ApiError {
    return new ApiError(429, message, code);
  }

  static internal(message = 'Internal server error', code = 'INTERNAL_ERROR'): ApiError {
    return new ApiError(500, message, code);
  }

  static serviceUnavailable(message: string, code = 'SERVICE_UNAVAILABLE'): ApiError {
    return new ApiError(503, message, code);
  }
}
