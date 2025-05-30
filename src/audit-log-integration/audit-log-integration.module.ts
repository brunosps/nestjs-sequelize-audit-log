import {
  DynamicModule,
  Module,
  Provider,
  MiddlewareConsumer,
  NestModule,
} from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AuditLogHttpService } from './services/audit-log-http.service';
import { AuditLogSoapClientService } from './services/audit-log-soap-client.service';
import { AuditLogGetInfoFromRequest } from '../interfaces/audit-log-module-options.interface';
import { AuditLogContextMiddleware } from './middlewares/audit-log-context.middleware';

type AuditLogIntegrationModuleOptions = {
  modelModule: any;
  getUserId?: AuditLogGetInfoFromRequest;
  getIpAddress?: AuditLogGetInfoFromRequest;
};

@Module({})
export class AuditLogIntegrationModule implements NestModule {
  static register(config: AuditLogIntegrationModuleOptions): DynamicModule {
    return {
      module: AuditLogIntegrationModule,
      imports: [HttpModule, config.modelModule],
      exports: [AuditLogSoapClientService],
      providers: [
        AuditLogHttpService,
        AuditLogSoapClientService,
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
    consumer.apply(AuditLogContextMiddleware).forRoutes('*');
  }
}
