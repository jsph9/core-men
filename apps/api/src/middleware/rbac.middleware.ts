import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role, JwtPayload } from '@coremen/types';
import { logSensitiveAccess } from '../services/audit.service';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export const requireRole = (...roles: Role[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = req.cookies?.auth_token;
      if (!token) {
        return res.status(401).json({ error: 'No autenticado' });
      }

      const payload = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
      
      if (!roles.includes(payload.role)) {
        // Registrar intento de acceso no autorizado en AuditLog
        await logSensitiveAccess(payload.userId, req.path, req.ip || '');
        return res.status(403).json({ error: 'Acceso prohibido' });
      }

      req.user = payload;
      next();
    } catch (error) {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }
  };
};
