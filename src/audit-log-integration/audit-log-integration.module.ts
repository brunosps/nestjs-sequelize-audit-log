import { DynamicModule, Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AuditLogHttpService } from './services/audit-log-http.service';
import { AuditLogCoreModule } from '../audit-log-core/audit-log-core.module';

@Module({})
export class AuditLogIntegrationModule {
  static register(): DynamicModule {
    return {
      module: AuditLogIntegrationModule,
      imports: [HttpModule, AuditLogCoreModule],
      exports: [],
      providers: [AuditLogHttpService],
    };
  }
}
