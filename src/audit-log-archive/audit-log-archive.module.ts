import { Module, type DynamicModule } from '@nestjs/common';

import { AuditLogArchiveService } from './services/audit-log-archive.service';
import { Sequelize } from 'sequelize-typescript';
import { AuditLogModel } from '../audit-log-model/audit-log.model';
import { AuditLogEntityModel } from '../audit-log-model/audit-log-entity.model';
import { AuditLogErrorModel } from '../audit-log-model/audit-log-error.model';
import { AuditLogEventModel } from '../audit-log-model/audit-log-event.model';
import { AuditLogIntegrationModel } from '../audit-log-model/audit-log-integration.model';
import { AuditLogRequestModel } from '../audit-log-model/audit-log-request.model';
import { AuditLogArchiveTask } from './tasks/audit-log-archive.task';
import { SequelizeModuleOptions } from '@nestjs/sequelize';

export class ArchiveLogModel extends AuditLogModel {}
export class ArchiveLogEntityModel extends AuditLogEntityModel {}
export class ArchiveLogErrorModel extends AuditLogErrorModel {}
export class ArchiveLogEventModel extends AuditLogEventModel {}
export class ArchiveLogIntegrationModel extends AuditLogIntegrationModel {}
export class ArchiveLogRequestModel extends AuditLogRequestModel {}

export interface AuditLogArchiveConfig {
  retentionPeriod: number;
  archiveDatabase: SequelizeModuleOptions;
  batchSize?: number;
}

@Module({})
export class AuditLogArchiveModule {
  static forRoot(config: AuditLogArchiveConfig): DynamicModule {
    const providers = [
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
          ];

          config.archiveDatabase.autoLoadModels = false;

          const sequelize = new Sequelize({
            ...config.archiveDatabase,
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
