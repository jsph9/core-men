import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { ErrorSeverity } from '@prisma/client';

/**
 * Middleware global de manejo de errores.
 * Registra los errores en la tabla ErrorLog y devuelve una respuesta sanitizada.
 */
export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  const statusCode = res.statusCode !== 200 ? res.statusCode : 500;

  // Log to ErrorLog in DB asynchronously (fire-and-forget)
  prisma.errorLog.create({
    data: {
      severity: statusCode >= 500 ? ErrorSeverity.CRITICAL : ErrorSeverity.MEDIUM,
      type: err.name || 'UNHANDLED_EXCEPTION',
      module: req.path,
      message: err.message,
      stackTrace: process.env.NODE_ENV === 'production' ? undefined : err.stack,
    }
  }).catch(logErr => console.error('Failed to log error to DB:', logErr));

  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);

  res.status(statusCode).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message,
  });
};
