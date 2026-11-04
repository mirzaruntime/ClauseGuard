import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { ZodError, type ZodType } from 'zod';
import { ApiError } from '../utils/ApiError';

/**
 * Validates and REPLACES req.body / req.query / req.params with the parsed,
 * coerced and stripped output so controllers only ever see trusted data.
 */
export function validate(schema: ZodType): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      }) as { body?: unknown; query?: unknown; params?: unknown };

      if (parsed.body !== undefined) req.body = parsed.body;
      if (parsed.query !== undefined) {
        Object.defineProperty(req, 'query', {
          value: parsed.query,
          writable: true,
          configurable: true,
          enumerable: true,
        });
      }
      if (parsed.params !== undefined) req.params = parsed.params as Request['params'];

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(
          ApiError.validation(
            'Request validation failed',
            error.issues.map((issue) => ({
              field: issue.path.join('.'),
              message: issue.message,
            })),
          ),
        );
        return;
      }
      next(error);
    }
  };
}
