import prisma from '../lib/prisma';
import { AuditEventType } from '@prisma/client';

export class AuditRepository {
  static async create(data: {
    type: AuditEventType;
    userId: string;
    entityType: string;
    entityId: string;
    previousValue?: any;
    newValue?: any;
    ipAddress?: string;
  }) {
    return prisma.auditLog.create({
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
  }
}
