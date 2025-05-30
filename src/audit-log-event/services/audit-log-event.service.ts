import { Inject, Injectable } from '@nestjs/common';

import { AuditLogService } from '../../audit-log-core/services/audit-log.service';

export interface AuditLogEventLogType {
  type: string;
  description: string;
  userId?: string;
  ipAddress?: string;
  details?: Record<string, any>;
}

@Injectable()
export class AuditLogEventService {
  constructor(
    @Inject(AuditLogService)
    private readonly auditLogService: AuditLogService,
  ) {}

  async logEvent(data: AuditLogEventLogType) {
    this.auditLogService.logEvent(data);
  }
}
