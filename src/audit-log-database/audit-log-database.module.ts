import { DynamicModule, Module } from '@nestjs/common';

import { AuditLogCoreModule } from '../audit-log-core/audit-log-core.module';

import { AuditLogDatabaseService } from './services/audit-log-database.service';

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
