import {
  DynamicModule,
  Global,
  MiddlewareConsumer,
  Module,
} from '@nestjs/common';

import {
  AuditLogBufferConfig,
  AuditLogGetInfoFromRequest,
} from '../interfaces/audit-log-module-options.interface';

import { AuditLogCoreMiddleware } from './middlewares/audit-log-core.middleware';
import { AuditLogBufferService } from './services/audit-log-buffer.service';
import { AuditLogService } from './services/audit-log.service';
import { PayloadDetailsService } from './services/payload-details.service';

const DEFAULT_BUFFER_CONFIG: AuditLogBufferConfig = {
  bufferSize: 100,
  flushIntervalMs: 5000,
  maxBufferSize: 1000,
};

type AuditCoreModuleOptions = {
  modelModule: any;
  getUserId?: AuditLogGetInfoFromRequest;
  getIpAddress?: AuditLogGetInfoFromRequest;
  logRetentionDays: number;
  enableBuffer?: boolean;
  bufferConfig?: Partial<AuditLogBufferConfig>;
};

@Global()
@Module({})
export class AuditLogCoreModule {
  static register(config: AuditCoreModuleOptions): DynamicModule {
    const providers: any[] = [
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
      {
        provide: 'ENABLE_BUFFER',
        useValue: !!config.enableBuffer,
      },
    ];

    if (config.enableBuffer) {
      const mergedConfig: AuditLogBufferConfig = {
        ...DEFAULT_BUFFER_CONFIG,
        ...config.bufferConfig,
      };

      providers.push(
        {
          provide: 'BUFFER_CONFIG',
          useValue: mergedConfig,
        },
        {
          provide: 'FLUSH_CALLBACK',
          useFactory: (auditLogService: AuditLogService) => {
            return (entries: any[]) => auditLogService.flushEntries(entries);
          },
          inject: [AuditLogService],
        },
        AuditLogBufferService,
        {
          provide: 'AUDIT_LOG_BUFFER_SERVICE',
          useExisting: AuditLogBufferService,
        },
      );
    } else {
      providers.push({
        provide: 'AUDIT_LOG_BUFFER_SERVICE',
        useValue: null,
      });
    }

    return {
      module: AuditLogCoreModule,
      imports: [config.modelModule],
      exports: [AuditLogService, PayloadDetailsService],
      providers,
    };
  }

  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuditLogCoreMiddleware).forRoutes('*');
  }
}
