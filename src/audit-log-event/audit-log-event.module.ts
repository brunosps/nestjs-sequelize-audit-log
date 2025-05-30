import { DynamicModule, Module } from '@nestjs/common';
import { AuditLogEventService } from './services/audit-log-event.service';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditLogEventInterceptor } from './interceptors/audit-log-event.interceptor';
import { AuditLogGetInfoFromRequest } from '../interfaces/audit-log-module-options.interface';

type AuditLogEventModuleOptions = {
  modelModule: any;
  getUserId?: AuditLogGetInfoFromRequest;
  getIpAddress?: AuditLogGetInfoFromRequest;
};

@Module({})
export class AuditLogEventModule {
  constructor(private auditLogEventService: AuditLogEventService) {
    (global as any)['AUDIT_LOG_SERVICE'] = this.auditLogEventService;
  }

  static register(config: AuditLogEventModuleOptions): DynamicModule {
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
        {
          provide: 'GET_USERID_FUNCTION',
          useValue: config.getUserId,
        },
        {
          provide: 'GET_IPADDRESS_FUNCTION',
          useValue: config.getIpAddress,
        },
      ],
    };
  }
}
