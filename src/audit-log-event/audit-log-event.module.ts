import { DynamicModule, Module } from '@nestjs/common';
import { AuditLogEventService } from './services/audit-log-event.service';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditLogEventInterceptor } from './interceptors/audit-log-event.interceptor';

type AuditLogEventModuleOptions = {
  modelModule: any;
};

@Module({})
export class AuditLogEventModule {
  constructor(private auditLogEventService: AuditLogEventService) {
    (global as any)['AUDIT_LOG_SERVICE'] = this.auditLogEventService;
  }

  static forRoot(config: AuditLogEventModuleOptions): DynamicModule {
    return {
      module: AuditLogEventModule,
      imports: [config.modelModule],
      exports: [AuditLogEventService, 'AUDIT_LOG_SERVICE'],
      providers: [
        AuditLogEventService,
        {
          provide: APP_INTERCEPTOR,
          useClass: AuditLogEventInterceptor,
        },
        {
          provide: 'AUDIT_LOG_SERVICE',
          useClass: AuditLogEventService,
        },
      ],
    };
  }
}
