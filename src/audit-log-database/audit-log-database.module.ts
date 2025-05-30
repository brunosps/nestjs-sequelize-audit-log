import { DynamicModule, MiddlewareConsumer, Module } from '@nestjs/common';
import { AuditLogDatabaseService } from './services/audit-log-database.service';
import { AuditLogCoreModule } from '../audit-log-core/audit-log-core.module';

type AuditDatabaseModuleOptions = {
  auditedTables: Array<string>;
};

@Module({})
export class AuditLogDatabaseModule {
  static register(config: AuditDatabaseModuleOptions): DynamicModule {
    return {
      module: AuditLogDatabaseModule,
      imports: [AuditLogCoreModule],
      providers: [
        AuditLogDatabaseService,
        {
          provide: 'AUDITEDTABLES',
          useValue: config.auditedTables,
        },
      ],
    };
  }
}
