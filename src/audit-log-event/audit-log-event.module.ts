import { DynamicModule, Module } from '@nestjs/common';

import { AuditLogCoreModule } from '../audit-log-core/audit-log-core.module';

import { AuditLogEventService } from './services/audit-log-event.service';

@Module({})
export class AuditLogEventModule {
  constructor(private auditLogEventService: AuditLogEventService) {
    (global as any)['AUDIT_LOG_SERVICE'] = this.auditLogEventService;
  }

  static register(): DynamicModule {
    return {
      module: AuditLogEventModule,
      imports: [AuditLogCoreModule],
      exports: [AuditLogEventService, 'AUDIT_LOG_SERVICE'],
      providers: [
        AuditLogEventService,
        {
          provide: 'AUDIT_LOG_SERVICE',
          useClass: AuditLogEventService,
        },
      ],
    };
  }
}
