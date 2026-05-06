import winston from 'winston';
import morgan from 'morgan';
import { Request, Response, NextFunction } from 'express';

/**
 * Winston logger configuration for structured logging.
 */
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'coremen-api' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

/**
 * Morgan HTTP request logger middleware using Winston as transport.
 */
export const requestLogger = morgan('combined', {
  stream: {
    write: (message: string) => {
      logger.info(message.trim());
    },
  },
});
