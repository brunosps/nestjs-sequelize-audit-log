import {
  DynamicModule,
  Global,
  MiddlewareConsumer,
  Module,
  NestModule,
  Provider,
} from '@nestjs/common';
import { AuditLogModelModule } from './audit-log-model/audit-log-model.module';
import { AuditLogDatabaseModule } from './audit-log-database/audit-log-database.module';
import { AuditLogErrorModule } from './audit-log-error/audit-log-error.module';
import { AuditLogEventModule } from './audit-log-event/audit-log-event.module';
import { AuditLogArchiveModule } from './audit-log-archive/audit-log-archive.module';
import { AuditLogIntegrationModule } from './audit-log-integration/audit-log-integration.module';
import { AuditLogRequestModule } from './audit-log-request/audit-log-request.module';
import { AuditLogModuleOptions } from './interfaces/audit-log-module-options.interface';
import { AuditLogCoreModule } from './audit-log-core/audit-log-core.module';

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
          authRoutes: options.authRoutes,
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
        }),
        AuditLogEventModule.register(),
        ...imports,
      ],
      exports: [AuditLogEventModule, ...exports],
      providers: [],
    };
  }
}
