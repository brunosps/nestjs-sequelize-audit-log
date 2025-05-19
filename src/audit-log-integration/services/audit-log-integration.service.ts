import { Injectable, Inject } from '@nestjs/common';
import { AuditLogModelModule } from '../../audit-log-model/audit-log-model.module';
import { AuditLogHttpService } from './audit-log-http.service';
import { AuditLogSoapClientService } from './audit-log-soap-client.service';

@Injectable()
export class AuditLogIntegrationService {
  constructor(
    private readonly modelModule: AuditLogModelModule,
    private readonly httpService: AuditLogHttpService,
    private readonly soapClient: AuditLogSoapClientService,
  ) {}

  async logIntegration(data: any) {
    // Implementação do log de integração
    console.log('Logging integration:', data);
  }
}
