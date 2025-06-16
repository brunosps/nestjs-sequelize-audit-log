import {
  DynamicModule,
  Global,
  MiddlewareConsumer,
  Module,
} from '@nestjs/common';

import { AuditLogGetInfoFromRequest } from '../interfaces/audit-log-module-options.interface';

import { AuditLogCoreMiddleware } from './middlewares/audit-log-core.middleware';
import { AuditLogService } from './services/audit-log.service';
import { PayloadDetailsService } from './services/payload-details.service';

type AuditCoreModuleOptions = {
  modelModule: any;
  getUserId?: AuditLogGetInfoFromRequest;
  getIpAddress?: AuditLogGetInfoFromRequest;
  logRetentionDays: number;
};

@Global()
@Module({})
export class AuditLogCoreModule {
  static register(config: AuditCoreModuleOptions): DynamicModule {
    return {
      module: AuditLogCoreModule,
      imports: [config.modelModule],
      exports: [AuditLogService, PayloadDetailsService],
      providers: [
        AuditLogCoreMiddleware,
        PayloadDetailsService,
        AuditLogService,
        {
          provide: 'GET_USERID_FUNCTION',
          useValue: config.getUserId,
        },
        {
          provide: 'GET_IPADDRESS_FUNCTION',
          useValue: config.getIpAddress,
        },
        {
          provide: 'LOG_RETENTION_DAYS',
          useValue: config.logRetentionDays,
        },
      ],
    };
  }

  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuditLogCoreMiddleware).forRoutes('*');
  }
}
