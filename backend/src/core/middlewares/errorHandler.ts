import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';
import { sendError } from '../utils/response';
import logger from '../../config/logger';

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const isAppError = err instanceof AppError;
  const statusCode = isAppError ? err.statusCode : 500;
  const traceId = req.traceId;

  if (statusCode >= 500) {
    logger.error(`Unhandled Exception [Trace: ${traceId}]: ${err.message}`, {
      stack: err.stack,
      traceId,
      url: req.originalUrl,
      method: req.method,
    });
  } else {
    logger.warn(`Operational Error [Trace: ${traceId}]: ${err.message}`, {
      traceId,
      statusCode,
      errorCode: isAppError ? err.errorCode : 'BAD_REQUEST',
    });
  }

  // Prevent sending headers twice
  if (res.headersSent) {
    return;
  }

  sendError(res, err, statusCode);
};

export default errorHandler;
