import { HttpModule } from '@nestjs/axios';
import { DynamicModule, Module } from '@nestjs/common';

import { AuditLogCoreModule } from '../audit-log-core/audit-log-core.module';

import { SoapClientUtilsProvider } from './providers/soap-client-utils.provider';
import { AuditLogHttpService } from './services/audit-log-http.service';
import { AuditLogSoapClientService } from './services/audit-log-soap-client.service';

@Module({})
export class AuditLogIntegrationModule {
  static register(): DynamicModule {
    return {
      module: AuditLogIntegrationModule,
      imports: [HttpModule, AuditLogCoreModule],
      exports: [],
      providers: [
        AuditLogHttpService,
        AuditLogSoapClientService,
        SoapClientUtilsProvider,
      ],
    };
  }
}
