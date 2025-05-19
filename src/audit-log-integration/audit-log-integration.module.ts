import { DynamicModule, Module, Provider } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AuditLogHttpService } from './services/audit-log-http.service';
import { AuditLogSoapClientService } from './services/audit-log-soap-client.service';
import { AuditLogIntegrationService } from './services/audit-log-integration.service';

type AuditLogIntegrationModuleOptions = {
  modelModule: any;
};

@Module({
  providers: [AuditLogIntegrationService],
  exports: [AuditLogIntegrationService],
})
export class AuditLogIntegrationModule {
  static forRoot(config: AuditLogIntegrationModuleOptions): DynamicModule {
    const providers: Provider[] = [
      AuditLogIntegrationService,
      AuditLogHttpService,
      AuditLogSoapClientService,
    ];

    return {
      module: AuditLogIntegrationModule,
      imports: [HttpModule, config.modelModule],
      exports: providers,
      providers,
    };
  }
}
