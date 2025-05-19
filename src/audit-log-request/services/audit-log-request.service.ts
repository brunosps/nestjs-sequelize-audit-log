import { Injectable, Inject } from '@nestjs/common';
import { AuditLogModelModule } from '../../audit-log-model/audit-log-model.module';

@Injectable()
export class AuditLogRequestService {
  constructor(
    @Inject('AUTH_ROUTE') private readonly config: any,
    private readonly modelModule: AuditLogModelModule,
  ) {}

  async logRequest(method: string, path: string, data: any) {
    // Implementação do log de request
    console.log('Logging request:', { method, path, data });
  }
}
