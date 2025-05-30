import { DynamicModule, MiddlewareConsumer, Module } from '@nestjs/common';
import { AuditLogModelModule } from '../audit-log-model/audit-log-model.module';
import { AuditLogRequestLoggingMiddleware } from './middlewares/audit-log-request-logging.middleware';
import {
  AuditLogGetInfoFromRequest,
  AuditLogRequestAuthRoute,
} from '../interfaces/audit-log-module-options.interface';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { RequestIdInterceptor } from './interceptors/request-id.interceptor';
import { AuditLogRequestService } from './services/audit-log-request.service';

export type AuditRequestModuleOptions = {
  authRoutes?: AuditLogRequestAuthRoute[];
  getUserId?: AuditLogGetInfoFromRequest;
  getIpAddress?: AuditLogGetInfoFromRequest;
};

@Module({})
export class AuditLogRequestModule {
  static register(config: AuditRequestModuleOptions): DynamicModule {
    return {
      module: AuditLogRequestModule,
      imports: [AuditLogModelModule],
      providers: [
        AuditLogRequestService,
        AuditLogRequestLoggingMiddleware,
        {
          provide: 'AUTH_ROUTES',
          useValue: config.authRoutes,
        },
        {
          provide: 'GET_USERID_FUNCTION',
          useValue: config.getUserId,
        },
        {
          provide: 'GET_IPADDRESS_FUNCTION',
          useValue: config.getIpAddress,
        },
        {
          provide: APP_INTERCEPTOR,
          useClass: RequestIdInterceptor,
        },
      ],
      exports: [AuditLogRequestService],
    };
  }

  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuditLogRequestLoggingMiddleware).forRoutes('*');
  }
}
