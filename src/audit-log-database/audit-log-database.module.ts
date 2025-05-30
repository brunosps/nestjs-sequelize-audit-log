import { DynamicModule, MiddlewareConsumer, Module } from '@nestjs/common';
import { AuditLogUserSessionMiddleware } from './middlewares/audit-log-user-session.middleware';
import { AuditLogDatabaseService } from './services/audit-log-database.service';

type AuditDatabaseModuleOptions = {
  auditedTables: Array<string>;
  enableTriggerDebugLog?: boolean;
};

@Module({})
export class AuditLogDatabaseModule {
  static register(config: AuditDatabaseModuleOptions): DynamicModule {
    return {
      module: AuditLogDatabaseModule,
      imports: [],
      providers: [
        AuditLogDatabaseService,
        {
          provide: 'AUDITEDTABLES',
          useValue: config.auditedTables,
        },
        {
          provide: 'ENABLETRIGGERDEBUGLOG',
          useValue: config.enableTriggerDebugLog,
        },
      ],
    };
  }

  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuditLogUserSessionMiddleware).forRoutes('*');
  }
}
