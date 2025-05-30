import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { v4 as uuidv4 } from 'uuid';
import { CreationAttributes } from 'sequelize';

import { AuditLogEventModel } from '../../audit-log-model/audit-log-event.model';
import { AuditLogModel } from '../../audit-log-model/audit-log.model';

export type AuditLogEventLogType = {
  type: string;
  description: string;
  userId?: string;
  ipAddress?: string;
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

  async logEvent({
    type,
    description,
    userId,
    ipAddress,
    details,
  }: AuditLogEventLogType) {
    const log = await this.auditLogModel.create({
      id: uuidv4(),
      logType: 'EVENT',
      userId: userId || 'system',
      ipAddress: ipAddress || '0.0.0.0',
    } as CreationAttributes<AuditLogModel>);

    await this.auditLogEventModel.create({
      id: uuidv4(),
      logId: log.id,
      eventType: type,
      eventDescription: description,
      eventDetails: JSON.stringify(details),
    } as CreationAttributes<AuditLogEventModel>);
  }
}
