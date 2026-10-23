import { Request, Response } from 'express';
import { AppError } from '../errors/AppError';

export interface StandardSuccessResponse<T> {
  success: true;
  statusCode: number;
  data: T;
  message?: string;
  traceId?: string;
}

export interface StandardErrorResponse {
  success: false;
  statusCode: number;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  traceId?: string;
}

export const sendSuccess = <T>(
  res: Response,
  data: T,
  statusCode = 200,
  message?: string
): Response => {
  const req = res.req as Request & { traceId?: string };
  const traceId = req.traceId || (res.getHeader('X-Trace-Id') as string) || undefined;

  const payload: StandardSuccessResponse<T> = {
    success: true,
    statusCode,
    data,
    ...(message && { message }),
    ...(traceId && { traceId }),
  };

  return res.status(statusCode).json(payload);
};

export const sendError = (
  res: Response,
  error: AppError | Error,
  customStatusCode?: number
): Response => {
  const req = res.req as Request & { traceId?: string };
  const traceId = req.traceId || (res.getHeader('X-Trace-Id') as string) || undefined;

  const isAppError = error instanceof AppError;
  const statusCode = customStatusCode || (isAppError ? error.statusCode : 500);
  const errorCode = isAppError ? error.errorCode : 'INTERNAL_SERVER_ERROR';
  const errorMessage = error.message || 'An unexpected error occurred.';
  const details = isAppError ? error.details : undefined;

  const payload: StandardErrorResponse = {
    success: false,
    statusCode,
    error: {
      code: errorCode,
      message: errorMessage,
      ...(details !== undefined && { details }),
    },
    ...(traceId && { traceId }),
  };

  return res.status(statusCode).json(payload);
};
