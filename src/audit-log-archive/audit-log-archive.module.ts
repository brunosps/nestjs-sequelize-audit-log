import { type DynamicModule, Logger, Module } from '@nestjs/common';
import { SequelizeModuleOptions } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { ConnectionError } from 'sequelize';

import { AuditLogModel } from '../audit-log-model/audit-log.model';
import { AuditLogDetailModel } from '../audit-log-model/audit-log-detail.model';
import { AuditLogEntityModel } from '../audit-log-model/audit-log-entity.model';
import { AuditLogErrorModel } from '../audit-log-model/audit-log-error.model';
import { AuditLogEventModel } from '../audit-log-model/audit-log-event.model';
import { AuditLogIntegrationModel } from '../audit-log-model/audit-log-integration.model';
import { AuditLogLoginModel } from '../audit-log-model/audit-log-login.model';
import { AuditLogRequestModel } from '../audit-log-model/audit-log-request.model';

import { AuditLogArchiveService } from './services/audit-log-archive.service';
import { AuditLogArchiveTask } from './tasks/audit-log-archive.task';

export class ArchiveLogModel extends AuditLogModel {}
export class ArchiveLogEntityModel extends AuditLogEntityModel {}
export class ArchiveLogErrorModel extends AuditLogErrorModel {}
export class ArchiveLogEventModel extends AuditLogEventModel {}
export class ArchiveLogIntegrationModel extends AuditLogIntegrationModel {}
export class ArchiveLogRequestModel extends AuditLogRequestModel {}
export class ArchiveLogLoginModel extends AuditLogLoginModel {}
export class ArchiveLogDetailModel extends AuditLogDetailModel {}

export interface AuditLogArchiveConfig {
  archiveCutoffDays?: number;
  archiveRetentionDays: number;
  archiveDatabase: SequelizeModuleOptions;
  batchSize?: number;
  archiveCronSchedule: string;
}

@Module({})
export class AuditLogArchiveModule {
  static async testSequelizeConnection(
    config: AuditLogArchiveConfig,
  ): Promise<boolean> {
    const logger = new Logger(AuditLogArchiveModule.name);

    const sequelize = new Sequelize({
      dialect: config.archiveDatabase.dialect,
      host: config.archiveDatabase.host,
      port: config.archiveDatabase.port,
      database: config.archiveDatabase.database,
      dialectOptions: config.archiveDatabase.dialectOptions,
      logging: null,
    });

    try {
      logger.log(
        `Trying to connect to the archive database ${config.archiveDatabase.host}`,
      );
      await sequelize.authenticate();
      logger.log('Successful connection');
      return true;
    } catch (error) {
      logger.error('Error connecting to the archive database', error);
      logger.error(error instanceof Error ? error.message : String(error));
    } finally {
      await sequelize.close();
    }
    return false;
  }

  static register(config: AuditLogArchiveConfig): DynamicModule {
    const providers = [
      {
        provide: 'ARCHIVE_CRON_SCHEDULE',
        useValue: config.archiveCronSchedule,
      },
      {
        provide: 'AUDIT_LOG_CONFIG',
        useValue: config,
      },
      {
        provide: 'ARCHIVE_SEQUELIZE',
        useFactory: async () => {
          config.archiveDatabase.models = [
            ArchiveLogModel,
            ArchiveLogEntityModel,
            ArchiveLogErrorModel,
            ArchiveLogEventModel,
            ArchiveLogIntegrationModel,
            ArchiveLogRequestModel,
            ArchiveLogLoginModel,
            ArchiveLogDetailModel,
          ];

          config.archiveDatabase.autoLoadModels = false;

          config.archiveDatabase.dialectOptions = {
            ...config.archiveDatabase.dialectOptions,
            connectTimeout: 1 * 60 * 1000,
            options: {
              requestTimeout: 1 * 60 * 1000,
            },
          };

          const sequelize = new Sequelize({
            ...config.archiveDatabase,
            logging: null,
            retry: null,
          });

          sequelize.addModels(config.archiveDatabase.models);
          await sequelize.sync();
          return sequelize;
        },
      },
      {
        provide: 'MAIN_SEQUELIZE',
        useExisting: Sequelize,
      },
      AuditLogArchiveService,
      AuditLogArchiveTask,
    ];

    return {
      module: AuditLogArchiveModule,
      imports: [],
      providers,
      exports: providers,
    };
  }
}
