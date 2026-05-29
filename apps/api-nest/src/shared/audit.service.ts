import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuditEventType } from '@prisma/client';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async logAudit(data: {
    type: AuditEventType;
    userId: string;
    entityType: string;
    entityId: string;
    previousValue?: any;
    newValue?: any;
    ipAddress?: string;
  }) {
    try {
      await this.prisma.auditLog.create({
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
      this.logger.error('Failed to write audit log:', error);
    }
  }

  async logSensitiveAccess(userId: string, path: string, ipAddress: string) {
    await this.logAudit({
      type: 'SENSITIVE_ACCESS',
      userId,
      entityType: 'Route',
      entityId: path,
      newValue: { status: 'DENIED', reason: 'ROLE_MISMATCH' },
      ipAddress,
    });
  }
}
