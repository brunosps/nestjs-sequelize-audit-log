import { Inject, Injectable } from '@nestjs/common';

import {
  AuditLogService,
  RegisterLogOptions,
} from '../../audit-log-core/services/audit-log.service';

export interface AuditLogEventLogType {
  type: string;
  description: string;
  userId?: string;
  ipAddress?: string;
  details?: Record<string, any>;
  eventStatus?: string;
}

@Injectable()
export class AuditLogEventService {
  constructor(
    @Inject(AuditLogService)
    private readonly auditLogService: AuditLogService,
  ) {}

  /**
   * Registra um evento e devolve o id do log, que serve como protocolo.
   *
   * A gravação é síncrona por padrão (mesmo com o buffer habilitado), então o
   * protocolo devolvido já existe no banco. Passe `{ sync: false }` para
   * enfileirar no buffer em cenários de alto volume — nesse caso o id é
   * devolvido antes da gravação, que acontece no flush.
   *
   * @returns o id do log, ou `null` caso a gravação direta falhe.
   */
  async logEvent(
    data: AuditLogEventLogType,
    options?: RegisterLogOptions,
  ): Promise<string | null> {
    return this.auditLogService.logEvent(data, options);
  }
}
