import {
  DynamicModule,
  Global,
  MiddlewareConsumer,
  Module,
} from '@nestjs/common';
import { AuditLogService } from './services/audit-log.service';
import { AuditLogCoreMiddleware } from './middlewares/audit-log-core.middleware';
import { AuditLogGetInfoFromRequest } from '../interfaces/audit-log-module-options.interface';

type AuditCoreModuleOptions = {
  modelModule: any;
  getUserId?: AuditLogGetInfoFromRequest;
  getIpAddress?: AuditLogGetInfoFromRequest;
};

@Global()
@Module({})
export class AuditLogCoreModule {
  static register(config: AuditCoreModuleOptions): DynamicModule {
    return {
      module: AuditLogCoreModule,
      imports: [config.modelModule],
      exports: [AuditLogService],
      providers: [
        AuditLogCoreMiddleware,
        AuditLogService,
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

  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuditLogCoreMiddleware).forRoutes('*');
  }
}
