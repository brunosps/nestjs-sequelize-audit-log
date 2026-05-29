import {
  DynamicModule,
  Global,
  Inject,
  Logger,
  MiddlewareConsumer,
  Module,
  OnModuleDestroy,
  Optional,
} from '@nestjs/common';
import { Sequelize } from 'sequelize-typescript';

import { AuditLogModel } from '../audit-log-model/audit-log.model';
import { AuditLogDetailModel } from '../audit-log-model/audit-log-detail.model';
import { AuditLogEntityModel } from '../audit-log-model/audit-log-entity.model';
import { AuditLogErrorModel } from '../audit-log-model/audit-log-error.model';
import { AuditLogEventModel } from '../audit-log-model/audit-log-event.model';
import { AuditLogIntegrationModel } from '../audit-log-model/audit-log-integration.model';
import { AuditLogLoginModel } from '../audit-log-model/audit-log-login.model';
import { AuditLogRequestModel } from '../audit-log-model/audit-log-request.model';
import {
  AuditLogBufferConfig,
  AuditLogGetInfoFromRequest,
  AuditLogSequelizeConfig,
} from '../interfaces/audit-log-module-options.interface';

import { AuditLogCoreMiddleware } from './middlewares/audit-log-core.middleware';
import { createAuditLogModelsProvider } from './providers/audit-log-models.provider';
import { AuditLogService } from './services/audit-log.service';
import { AuditLogBufferService } from './services/audit-log-buffer.service';
import { PayloadDetailsService } from './services/payload-details.service';

const DEFAULT_BUFFER_CONFIG: AuditLogBufferConfig = {
  bufferSize: 100,
  flushIntervalMs: 5000,
  maxBufferSize: 1000,
  maxFlushRetries: 3,
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
export class AuditLogCoreModule implements OnModuleDestroy {
  private static readonly logger = new Logger(AuditLogCoreModule.name);

  constructor(
    @Optional()
    @Inject('AUDIT_SEQUELIZE')
    private readonly auditSequelize?: Sequelize | null,
  ) {}

  async onModuleDestroy() {
    if (this.auditSequelize) {
      await this.auditSequelize.close();
      AuditLogCoreModule.logger.log('Audit log dedicated pool closed');
    }
  }

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
      createAuditLogModelsProvider(),
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
