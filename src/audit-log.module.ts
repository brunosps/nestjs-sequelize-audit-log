import { DynamicModule, Logger, Module } from '@nestjs/common';

import { AuditLogArchiveModule } from './audit-log-archive/audit-log-archive.module';
import { AuditLogCoreModule } from './audit-log-core/audit-log-core.module';
import { AuditLogDatabaseModule } from './audit-log-database/audit-log-database.module';
import { AuditLogErrorModule } from './audit-log-error/audit-log-error.module';
import { AuditLogEventModule } from './audit-log-event/audit-log-event.module';
import { AuditLogIntegrationModule } from './audit-log-integration/audit-log-integration.module';
import { AuditLogModelModule } from './audit-log-model/audit-log-model.module';
import { AuditLogRequestModule } from './audit-log-request/audit-log-request.module';
import { AuditLogModuleOptions } from './interfaces/audit-log-module-options.interface';
import { AuditLogCleaningTask } from './tasks/audit-log-cleaning.task';

@Module({})
export class AuditLogModule {
  static async register(
    options: AuditLogModuleOptions = {
      logRetentionDays: 5,
      cleaningCronSchedule: '0 0 * * *',
    },
  ): Promise<DynamicModule> {
    const imports = [];
    const exports = [];
    const providers = [];
    const auditedTables = options.auditedTables ?? [];

    if (
      options.enableArchive &&
      (await AuditLogArchiveModule.testSequelizeConnection({
        ...options.enableArchive,
        archiveCutoffDays: options.logRetentionDays,
      }))
    ) {
      imports.push(AuditLogArchiveModule.register(options.enableArchive));
    } else {
      providers.push(AuditLogCleaningTask);
      providers.push({
        provide: 'CLEANING_CRON_SCHEDULE',
        useValue: options.cleaningCronSchedule,
      });
    }

    if (auditedTables.length > 0) {
      imports.push(
        AuditLogDatabaseModule.register({
          auditedTables,
        }),
      );
    }

    if (options.enableErrorLogging) {
      imports.push(AuditLogErrorModule.register());
    }

    if (options.enableIntegrationLogging) {
      imports.push(AuditLogIntegrationModule.register());

      exports.push(AuditLogIntegrationModule);
    }

    if (options.enableRequestLogging) {
      imports.push(
        AuditLogRequestModule.register({
          authRoutes: Array.isArray(options.enableRequestLogging)
            ? options.enableRequestLogging
            : [],
        }),
      );
      exports.push(AuditLogRequestModule);
    }

    return {
      module: AuditLogModule,
      imports: [
        AuditLogCoreModule.register({
          modelModule: AuditLogModelModule,
          getIpAddress: options.getIpAddress,
          getUserId: options.getUserId,
          logRetentionDays: options.logRetentionDays,
        }),
        AuditLogEventModule.register(),
        ...imports,
      ],
      exports: [AuditLogEventModule, ...exports],
      providers,
    };
  }
}
