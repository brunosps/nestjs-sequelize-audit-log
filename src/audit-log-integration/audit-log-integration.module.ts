import { HttpModule } from '@nestjs/axios';
import { DynamicModule, Module } from '@nestjs/common';

import { SoapClientUtilsProvider } from './providers/soap-client-utils.provider';
import { AuditLogHttpService } from './services/audit-log-http.service';
import { AuditLogSoapClientService } from './services/audit-log-soap-client.service';

export interface AuditLogIntegrationModuleOptions {
  enableLogging?: boolean;
}

@Module({})
export class AuditLogIntegrationModule {
  static register(
    options: AuditLogIntegrationModuleOptions = {},
  ): DynamicModule {
    return {
      module: AuditLogIntegrationModule,
      imports: [HttpModule],
      exports: [],
      providers: [
        {
          provide: 'ENABLE_INTEGRATION_LOGGING',
          useValue: options.enableLogging ?? false,
        },
        AuditLogHttpService,
        AuditLogSoapClientService,
        SoapClientUtilsProvider,
      ],
    };
  }
}
