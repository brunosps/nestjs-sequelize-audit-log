import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { v4 as uuidv4 } from 'uuid';

import { AuditLogEventModel } from '../../audit-log-model/audit-log-event.model';
import { AuditLogModel } from '../../audit-log-model/audit-log.model';

type AuditLogEventLogType = {
  type: string;
  description: string;
  userId?: string;
  userIp?: string;
  details?: Record<string, any>;
};

@Injectable()
export class AuditLogEventService {
  constructor(
    @InjectModel(AuditLogModel)
    private readonly auditLogModel: typeof AuditLogModel,

    @InjectModel(AuditLogEventModel)
    private readonly auditLogEventModel: typeof AuditLogEventModel,
  ) {}

  async logEvent(
    eventType: string,
    eventDescription: string,
    eventDetails: any,
    userId?: string,
    ipAddress?: string,
  ) {
    const log = await (this.auditLogModel as any).create({
      id: uuidv4(),
      logType: 'EVENT',
      userId: userId || 'system', // Provide default
      ipAddress: ipAddress || 'unknown', // Provide default
      createdAt: new Date(),
    });

    await (this.auditLogEventModel as any).create({
      id: uuidv4(),
      logId: log.id,
      eventType,
      eventDescription,
      eventDetails: JSON.stringify(eventDetails),
      // createdAt will be handled by Sequelize/database
    } as any); // Cast to any to satisfy missing properties like createdAt
  }
}
