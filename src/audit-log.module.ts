import { DynamicModule, Global, Module, Provider } from '@nestjs/common';
import { AuditLogModelModule } from './audit-log-model/audit-log-model.module';
import { AuditLogDatabaseModule } from './audit-log-database/audit-log-database.module';
import { AuditLogErrorModule } from './audit-log-error/audit-log-error.module';
import { AuditLogEventModule } from './audit-log-event/audit-log-event.module';
import { AuditLogArchiveModule } from './audit-log-archive/audit-log-archive.module';
import { AuditLogIntegrationModule } from './audit-log-integration/audit-log-integration.module';
import { AuditLogRequestModule } from './audit-log-request/audit-log-request.module';
import { AuditLogModuleOptions } from './interfaces/audit-log-module-options.interface';
import { AuditLogService } from './services/audit-log.service';

@Global()
@Module({})
export class AuditLogModule {
  static register(options: AuditLogModuleOptions = {}): DynamicModule {
    const imports = [];
    const exports = [];
    const auditedTables = options.auditedTables ?? [];

    if (options.enableArchive) {
      imports.push(AuditLogArchiveModule.register(options.enableArchive));
    }

    if (auditedTables.length > 0) {
      imports.push(
        AuditLogDatabaseModule.register({
          auditedTables,
          enableTriggerDebugLog: options.enableTriggerDebugLog ?? false,
        }),
      );
    }

    if (options.enableErrorLogging) {
      imports.push(
        AuditLogErrorModule.register({
          modelModule: AuditLogModelModule,
          getUserId: options.getUserId,
          getIpAddress: options.getIpAddress,
        }),
      );
    }

    if (options.enableIntegrationLogging) {
      imports.push(
        AuditLogIntegrationModule.register({
          modelModule: AuditLogModelModule,
        }),
      );

      exports.push(AuditLogIntegrationModule);
    }

    if (options.enableRequestLogging) {
      imports.push(
        AuditLogRequestModule.register({
          authRoutes: options.authRoutes,
          getUserId: options.getUserId,
          getIpAddress: options.getIpAddress,
        }),
      );
      exports.push(AuditLogRequestModule);
    }

    return {
      module: AuditLogModule,
      imports: [
        AuditLogEventModule.register({ modelModule: AuditLogModelModule }),
        ...imports,
      ],
      exports: [AuditLogEventModule, AuditLogService, ...exports],
      providers: [AuditLogService],
    };
  }
}
