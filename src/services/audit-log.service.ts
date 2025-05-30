import { Injectable } from '@nestjs/common';
import {
  AuditLogEventLogType,
  AuditLogEventService,
} from '../audit-log-event/services/audit-log-event.service';

@Injectable()
export class AuditLogService {
  constructor(private readonly auditLogEventService: AuditLogEventService) {}

  logEvent({
    type,
    description,
    details,
    userId,
    ipAddress,
  }: AuditLogEventLogType): Promise<void> {
    return this.auditLogEventService.logEvent({
      type,
      description,
      details,
      userId,
      ipAddress,
    });
  }
}
