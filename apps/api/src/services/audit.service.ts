import prisma from '../lib/prisma';
import { AuditEventType } from '@prisma/client';

/**
 * Registra una acción sensible en el log de auditoría
 */
export const logAudit = async (data: {
  type: AuditEventType;
  userId: string;
  entityType: string;
  entityId: string;
  previousValue?: any;
  newValue?: any;
  ipAddress?: string;
}) => {
  try {
    await prisma.auditLog.create({
      data: {
        type: data.type,
        userId: data.userId,
        entityType: data.entityType,
        entityId: data.entityId,
        previousValue: data.previousValue ? JSON.parse(JSON.stringify(data.previousValue)) : null,
        newValue: data.newValue ? JSON.parse(JSON.stringify(data.newValue)) : null,
        ipAddress: data.ipAddress,
      },
    });
  } catch (error) {
    // Si falla el log de auditoría, se registra en la consola/error log, pero no debe tumbar la operación
    console.error('Failed to write audit log:', error);
  }
};

/**
 * Log específico para acceso denegado por RBAC
 */
export const logSensitiveAccess = async (userId: string, path: string, ipAddress: string) => {
  await logAudit({
    type: 'SENSITIVE_ACCESS',
    userId,
    entityType: 'Route',
    entityId: path,
    newValue: { status: 'DENIED', reason: 'ROLE_MISMATCH' },
    ipAddress,
  });
};
