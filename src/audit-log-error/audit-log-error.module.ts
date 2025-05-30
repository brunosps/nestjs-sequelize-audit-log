import { DynamicModule, Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { AuditLogErrorLoggingFilter } from './filters/audit-log-error-logging.filter';
import { AuditLogCoreModule } from '../audit-log-core/audit-log-core.module';

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
