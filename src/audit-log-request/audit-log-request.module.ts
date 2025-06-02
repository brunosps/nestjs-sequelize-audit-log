import { DynamicModule, MiddlewareConsumer, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { AuditLogModelModule } from '../audit-log-model/audit-log-model.module';
import { AuditLogRequestAuthRoute } from '../interfaces/audit-log-module-options.interface';

import { RequestIdInterceptor } from './interceptors/request-id.interceptor';
import { AuditLogRequestLoggingMiddleware } from './middlewares/audit-log-request-logging.middleware';
import { AuditLogRequestService } from './services/audit-log-request.service';

export type AuditRequestModuleOptions = {
  authRoutes?: AuditLogRequestAuthRoute[];
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
