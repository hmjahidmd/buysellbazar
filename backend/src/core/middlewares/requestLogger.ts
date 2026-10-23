import { Request, Response, NextFunction } from 'express';
import logger from '../../config/logger';

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  const { method, originalUrl, ip } = req;

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const { statusCode } = res;
    const traceId = req.traceId;

    const logMessage = `${method} ${originalUrl} ${statusCode} - ${duration}ms [IP: ${ip}]`;

    if (statusCode >= 500) {
      logger.error(logMessage, { traceId, method, originalUrl, statusCode, duration });
    } else if (statusCode >= 400) {
      logger.warn(logMessage, { traceId, method, originalUrl, statusCode, duration });
    } else {
      logger.info(logMessage, { traceId, method, originalUrl, statusCode, duration });
    }
  });

  next();
};

export default requestLogger;
