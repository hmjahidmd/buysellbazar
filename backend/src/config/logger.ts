import winston from 'winston';
import env from './env';

const { combine, timestamp, printf, colorize, json, errors } = winston.format;

const devLogFormat = printf(({ level, message, timestamp, stack, traceId }) => {
  const trace = traceId ? ` [Trace: ${traceId}]` : '';
  return `${timestamp} ${level}:${trace} ${stack || message}`;
});

export const logger = winston.createLogger({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    env.NODE_ENV === 'production' ? json() : combine(colorize(), devLogFormat)
  ),
  defaultMeta: { service: 'buysellbd-backend' },
  transports: [
    new winston.transports.Console(),
    ...(env.NODE_ENV === 'production'
      ? [
          new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
          new winston.transports.File({ filename: 'logs/combined.log' }),
        ]
      : []),
  ],
});

export default logger;
