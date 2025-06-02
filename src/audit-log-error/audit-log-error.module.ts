import { DynamicModule, Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';

import { AuditLogCoreModule } from '../audit-log-core/audit-log-core.module';

import { AuditLogErrorLoggingFilter } from './filters/audit-log-error-logging.filter';

@Module({})
export class AuditLogErrorModule {
  static register(): DynamicModule {
    return {
      module: AuditLogErrorModule,
      imports: [AuditLogCoreModule],
      providers: [
        AuditLogErrorLoggingFilter,
        {
          provide: APP_FILTER,
          useClass: AuditLogErrorLoggingFilter,
        },
      ],
    };
  }
}
