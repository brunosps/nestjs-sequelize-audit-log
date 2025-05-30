import { DynamicModule, Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { AuditLogErrorLoggingFilter } from './filters/audit-log-error-logging.filter';
import { AuditLogGetInfoFromRequest } from '../interfaces/audit-log-module-options.interface';

type AuditLogErrorModuleOptions = {
  modelModule: any;
  getUserId?: AuditLogGetInfoFromRequest;
  getIpAddress?: AuditLogGetInfoFromRequest;
};

@Module({})
export class AuditLogErrorModule {
  static register(config: AuditLogErrorModuleOptions): DynamicModule {
    return {
      module: AuditLogErrorModule,
      imports: [config.modelModule],
      providers: [
        AuditLogErrorLoggingFilter,
        {
          provide: APP_FILTER,
          useClass: AuditLogErrorLoggingFilter,
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
