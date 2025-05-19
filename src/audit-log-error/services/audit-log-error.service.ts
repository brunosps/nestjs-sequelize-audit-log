import { Injectable, Inject } from '@nestjs/common';
import { AuditLogModelModule } from '../../audit-log-model/audit-log-model.module';

@Injectable()
export class AuditLogErrorService {
  constructor(private readonly modelModule: AuditLogModelModule) {}

  async logError(message: string, error: Error) {
    // Implementação do log de erro
    console.error('Logging error:', { message, error });
  }
}
