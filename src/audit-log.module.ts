import { DynamicModule, Module, Provider } from '@nestjs/common';
import { AuditLogModelModule } from './audit-log-model/audit-log-model.module';
import { AuditLogDatabaseModule } from './audit-log-database/audit-log-database.module';
import { AuditLogErrorModule } from './audit-log-error/audit-log-error.module';
import { AuditLogEventModule } from './audit-log-event/audit-log-event.module';
import { AuditLogArchiveModule } from './audit-log-archive/audit-log-archive.module';
import { AuditLogIntegrationModule } from './audit-log-integration/audit-log-integration.module';
import { AuditLogRequestModule } from './audit-log-request/audit-log-request.module';
import { AuditLogModuleOptions } from './interfaces/audit-log-module-options.interface';

@Module({})
export class AuditLogModule {
  static register(options: AuditLogModuleOptions = {}): DynamicModule {
    const imports: any[] = [];
    const providers: Provider[] = [
      {
        provide: 'AUDIT_LOG_OPTIONS', // AuditLogRequestModule and AuditLogDatabaseModule can inject this
        useValue: options,
      },
      {
        provide: 'AUDIT_LOG_EXCLUDED_ROUTES',
        useValue: options.excludedRoutes || [],
      },
      {
        provide: 'AUDIT_LOG_DATABASE_CONNECTION',
        useValue: options.databaseConnection || '',
      },
    ];

    if (options.enableIntegrationModule) {
      imports.push(AuditLogIntegrationModule);
    }
    // Import AuditLogRequestModule directly. It should get its config from AUDIT_LOG_OPTIONS if needed.
    // The 'authRoute' should be part of 'options' if AuditLogRequestModule needs it.
    if (options.enableRequestModule !== false) {
      imports.push(AuditLogRequestModule);
    }

    imports.push(AuditLogModelModule);
    // Import AuditLogDatabaseModule directly. It should get its config from AUDIT_LOG_OPTIONS.
    imports.push(AuditLogDatabaseModule);
    imports.push(AuditLogErrorModule);
    imports.push(AuditLogEventModule);
    imports.push(AuditLogArchiveModule);

    providers.forEach((p: Provider, i: number) => {
      // console.log(`Provider ${i}:`, p);
    });

    return {
      module: AuditLogModule,
      imports,
      providers,
      exports: [...providers],
    };
  }
}
