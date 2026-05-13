import {
  DynamicModule,
  Global,
  Logger,
  MiddlewareConsumer,
  Module,
  OnModuleDestroy,
} from '@nestjs/common';
import { Sequelize } from 'sequelize-typescript';

import {
  AuditLogBufferConfig,
  AuditLogGetInfoFromRequest,
  AuditLogSequelizeConfig,
} from '../interfaces/audit-log-module-options.interface';
import { AuditLogModel } from '../audit-log-model/audit-log.model';
import { AuditLogDetailModel } from '../audit-log-model/audit-log-detail.model';
import { AuditLogEntityModel } from '../audit-log-model/audit-log-entity.model';
import { AuditLogErrorModel } from '../audit-log-model/audit-log-error.model';
import { AuditLogEventModel } from '../audit-log-model/audit-log-event.model';
import { AuditLogIntegrationModel } from '../audit-log-model/audit-log-integration.model';
import { AuditLogLoginModel } from '../audit-log-model/audit-log-login.model';
import { AuditLogRequestModel } from '../audit-log-model/audit-log-request.model';

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
  auditSequelize?: AuditLogSequelizeConfig;
};

const AUDIT_MODELS = [
  AuditLogModel,
  AuditLogEntityModel,
  AuditLogErrorModel,
  AuditLogEventModel,
  AuditLogIntegrationModel,
  AuditLogRequestModel,
  AuditLogLoginModel,
  AuditLogDetailModel,
];

@Global()
@Module({})
export class AuditLogCoreModule {
  private static readonly logger = new Logger(AuditLogCoreModule.name);

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
      {
        provide: 'AUDIT_SEQUELIZE',
        useFactory: async () => {
          if (!config.auditSequelize) return null;

          try {
            const sequelize = new Sequelize({
              dialect: config.auditSequelize.dialect as any,
              host: config.auditSequelize.host,
              port: config.auditSequelize.port,
              database: config.auditSequelize.database,
              username: config.auditSequelize.username,
              password: config.auditSequelize.password,
              pool: config.auditSequelize.pool || {
                max: 5,
                min: 1,
                idle: 10000,
                acquire: 15000,
              },
              dialectOptions: config.auditSequelize.dialectOptions,
              logging: false,
            });

            sequelize.addModels(AUDIT_MODELS);
            await sequelize.authenticate();
            AuditLogCoreModule.logger.log(
              'Audit log dedicated pool connected successfully',
            );
            return sequelize;
          } catch (error) {
            AuditLogCoreModule.logger.error(
              'Failed to connect audit dedicated pool, falling back to main pool',
              error,
            );
            return null;
          }
        },
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
      exports: [AuditLogService, PayloadDetailsService, 'AUDIT_SEQUELIZE'],
      providers,
    };
  }

  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuditLogCoreMiddleware).forRoutes('*');
  }
}
