import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { AsyncLocalStorage } from 'async_hooks';
import { CreationAttributes, Op } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';

import { AuditLogDatabaseType } from '../../audit-log-database/services/audit-log-database.service';
import { AuditLogErrorType } from '../../audit-log-error/filters/audit-log-error-logging.filter';
import { AuditLogEventLogType } from '../../audit-log-event/services/audit-log-event.service';
import { AuditLogHttpIntegrationType } from '../../audit-log-integration/services/audit-log-http.service';
import { AuditLogModel } from '../../audit-log-model/audit-log.model';
import { AuditLogDetailModel } from '../../audit-log-model/audit-log-detail.model';
import { AuditLogEntityModel } from '../../audit-log-model/audit-log-entity.model';
import { AuditLogErrorModel } from '../../audit-log-model/audit-log-error.model';
import { AuditLogEventModel } from '../../audit-log-model/audit-log-event.model';
import { AuditLogIntegrationModel } from '../../audit-log-model/audit-log-integration.model';
import { AuditLogLoginModel } from '../../audit-log-model/audit-log-login.model';
import { AuditLogRequestModel } from '../../audit-log-model/audit-log-request.model';
import {
  AuditLogLoginType,
  AuditLogRequestType,
} from '../../audit-log-request/middlewares/audit-log-request-logging.middleware';
import {
  AuditLogGetInfoFromRequest,
  AuditLogRequest,
} from '../../interfaces/audit-log-module-options.interface';
import { compressPayload } from '../../utils/compressPayload';
import { extractClientIp } from '../../utils/ip';
import { sanitizePayload } from '../../utils/sanitizePayload';
import {
  AUDIT_LOG_MODELS,
  AuditLogModelSet,
} from '../providers/audit-log-models.provider';

import { AuditLogBufferService, BufferEntry } from './audit-log-buffer.service';
import { PayloadDetailsService } from './payload-details.service';

export type AuditLogType =
  | 'ENTITY'
  | 'REQUEST'
  | 'ERROR'
  | 'EVENT'
  | 'LOGIN'
  | 'INTEGRATION';
export type AuditLogDataType =
  | AuditLogEventLogType
  | AuditLogDatabaseType
  | AuditLogErrorType
  | AuditLogHttpIntegrationType
  | AuditLogLoginType
  | AuditLogRequestType;

export type RegisterLogOptions = {
  /**
   * Força (`true`) ou dispensa (`false`) a gravação síncrona, ignorando o
   * buffer. Quando omitido, apenas `EVENT` grava de forma síncrona.
   */
  sync?: boolean;
};

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(
    @InjectModel(AuditLogModel)
    private readonly auditLogModel: typeof AuditLogModel,

    @InjectModel(AuditLogEventModel)
    private readonly auditLogEventModel: typeof AuditLogEventModel,

    @InjectModel(AuditLogEntityModel)
    private readonly auditLogEntityModel: typeof AuditLogEntityModel,

    @InjectModel(AuditLogErrorModel)
    private readonly auditLogErrorModel: typeof AuditLogErrorModel,

    @InjectModel(AuditLogIntegrationModel)
    private readonly auditLogIntegrationModel: typeof AuditLogIntegrationModel,

    @InjectModel(AuditLogRequestModel)
    private auditLogRequestModel: typeof AuditLogRequestModel,

    @InjectModel(AuditLogLoginModel)
    private auditLogLoginModel: typeof AuditLogLoginModel,

    @InjectModel(AuditLogDetailModel)
    private readonly auditLogDetailModel: typeof AuditLogDetailModel,

    private readonly payloadDetailsService: PayloadDetailsService,

    @Inject('LOG_RETENTION_DAYS')
    private logRetentionDays: number,

    @Optional()
    @Inject('GET_USERID_FUNCTION')
    private getUserIdFn?: AuditLogGetInfoFromRequest,

    @Optional()
    @Inject('GET_IPADDRESS_FUNCTION')
    private getIpAddressFn?: AuditLogGetInfoFromRequest,

    @Optional()
    @Inject('AUDIT_LOG_BUFFER_SERVICE')
    private readonly bufferService?: AuditLogBufferService,

    @Optional()
    @Inject('ENABLE_BUFFER')
    private readonly bufferEnabled?: boolean,

    @Optional()
    @Inject(AUDIT_LOG_MODELS)
    private readonly auditModels?: AuditLogModelSet,
  ) {
    if (this.bufferService && this.bufferEnabled) {
      this.bufferService.setFlushCallback((entries) =>
        this.flushEntries(entries),
      );
    }
  }

  private static readonly asyncLocalStorage =
    new AsyncLocalStorage<AuditLogRequest>();

  static runWithRequest<T>(req: AuditLogRequest, callback: () => T): T {
    return this.asyncLocalStorage.run(req, callback);
  }

  private getCurrentRequest(): AuditLogRequest | undefined {
    return AuditLogService.asyncLocalStorage.getStore();
  }

  private get models(): AuditLogModelSet {
    return (
      this.auditModels || {
        auditLogModel: this.auditLogModel,
        auditLogEventModel: this.auditLogEventModel,
        auditLogEntityModel: this.auditLogEntityModel,
        auditLogErrorModel: this.auditLogErrorModel,
        auditLogIntegrationModel: this.auditLogIntegrationModel,
        auditLogRequestModel: this.auditLogRequestModel,
        auditLogLoginModel: this.auditLogLoginModel,
        auditLogDetailModel: this.auditLogDetailModel,
      }
    );
  }

  getUserInformation(): { id: string; ip: string } {
    const req = this.getCurrentRequest();

    const userInformation = {
      id: 'system',
      ip: '0.0.0.0',
    };

    if (req) {
      userInformation.id = String(req['user']?.id || 'system');
      userInformation.ip = extractClientIp(req);

      if (this.getUserIdFn) {
        userInformation.id = this.getUserIdFn(req);
      }

      if (this.getIpAddressFn) {
        userInformation.ip = this.getIpAddressFn(req);
      }
    }
    return userInformation;
  }

  async clearLogs() {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.logRetentionDays);

    // await this.auditLogEventModel.destroy({
    //   where: {
    //     createdAt: {
    //       [Op.lt]: cutoffDate,
    //     },
    //   },
    // });

    // await this.auditLogEntityModel.destroy({
    //   where: {
    //     createdAt: {
    //       [Op.lt]: cutoffDate,
    //     },
    //   },
    // });

    await this.models.auditLogErrorModel.destroy({
      where: {
        createdAt: {
          [Op.lt]: cutoffDate,
        },
      },
    });

    await this.models.auditLogIntegrationModel.destroy({
      where: {
        createdAt: {
          [Op.lt]: cutoffDate,
        },
      },
    });

    await this.models.auditLogRequestModel.destroy({
      where: {
        createdAt: {
          [Op.lt]: cutoffDate,
        },
      },
    });

    // await this.auditLogLoginModel.destroy({
    //   where: {
    //     createdAt: {
    //       [Op.lt]: cutoffDate,
    //     },
    //   },
    // });

    await this.models.auditLogDetailModel.destroy({
      where: {
        createdAt: {
          [Op.lt]: cutoffDate,
        },
      },
    });

    await this.models.auditLogModel.destroy({
      where: {
        createdAt: {
          [Op.lt]: cutoffDate,
        },
      },
    });
  }

  /**
   * Registra um log de evento e devolve o id do log, que serve como protocolo.
   *
   * Eventos são gravados de forma síncrona por padrão (mesmo com o buffer
   * habilitado), para que o protocolo devolvido já exista no banco. Passe
   * `{ sync: false }` para enfileirar no buffer em cenários de alto volume —
   * nesse caso o id é devolvido antes da gravação, que acontece no flush.
   *
   * @returns o id do log, ou `null` caso a gravação direta falhe.
   */
  async logEvent(
    data: AuditLogEventLogType,
    options?: RegisterLogOptions,
  ): Promise<string | null> {
    return this.registerLog('EVENT', data, options);
  }

  /**
   * Registra um log e devolve o id gerado, que serve como protocolo.
   *
   * Com o buffer habilitado a gravação é adiada para o flush e o id é devolvido
   * imediatamente — exceto para `EVENT`, que grava de forma síncrona por padrão
   * para garantir que o protocolo já exista no banco. Use `options.sync` para
   * forçar o comportamento em qualquer direção.
   *
   * @returns o id do log, ou `null` caso a gravação direta falhe.
   */
  async registerLog(
    logType: AuditLogType,
    data: AuditLogDataType,
    options?: RegisterLogOptions,
  ): Promise<string | null> {
    const logId = uuidv4();
    const sync = options?.sync ?? logType === 'EVENT';

    if (!sync && this.bufferService && this.bufferEnabled) {
      const userInformation = this.getUserInformation();
      this.bufferService.add({
        logId,
        logType,
        data,
        userInfo: userInformation,
        timestamp: new Date(),
      });
      return logId;
    }

    return this._directRegisterLog(logType, data, undefined, logId);
  }

  async flushEntries(entries: BufferEntry[]): Promise<void> {
    const entityEntries = entries.filter((e) => e.logType === 'ENTITY');
    const otherEntries = entries.filter((e) => e.logType !== 'ENTITY');

    if (entityEntries.length > 0) {
      await this.bulkRegisterLog(
        'ENTITY',
        entityEntries.map((e) => e.data as AuditLogDatabaseType),
        entityEntries.map((e) => e.userInfo),
        entityEntries.map((e) => e.logId),
      );
    }

    for (const entry of otherEntries) {
      try {
        await this._directRegisterLog(
          entry.logType as AuditLogType,
          entry.data,
          entry.userInfo,
          entry.logId,
        );
      } catch (error) {
        this.logger.error(
          `Error flushing audit log entry (${entry.logType}):`,
          error,
        );
      }
    }
  }

  async _directRegisterLog(
    logType: AuditLogType,
    data: AuditLogDataType,
    userInfoOverride?: { id: string; ip: string },
    logIdOverride?: string,
  ): Promise<string | null> {
    try {
      const userInformation = userInfoOverride || this.getUserInformation();

      const log = await this.models.auditLogModel.create({
        id: logIdOverride || uuidv4(),
        logType: logType,
        userId: userInformation.id,
        ipAddress: userInformation.ip,
      } as CreationAttributes<AuditLogModel>);

      switch (logType) {
        case 'EVENT':
          await this._logEvent(log.id, data as AuditLogEventLogType);
          break;
        case 'ENTITY':
          await this._logEntity(log.id, data as AuditLogDatabaseType);
          break;
        case 'ERROR':
          await this._logError(log.id, data as AuditLogErrorType);
          break;
        case 'INTEGRATION':
          await this._logIntegration(
            log.id,
            data as AuditLogHttpIntegrationType,
          );
          break;
        case 'REQUEST':
          await this._logRequest(log.id, data as AuditLogRequestType);
          break;
        case 'LOGIN':
          data = data as AuditLogLoginType;
          log.userId = data.userId || userInformation.id;
          await log.save();
          await this._logLogin(log.id, log.userId, data as AuditLogLoginType);
          if (data.registerRequest) {
            await this._logRequest(log.id, data.request as AuditLogRequestType);
          }
          break;

        default:
          break;
      }

      return log.id;
    } catch (error) {
      this.logger.error(`Error registering audit log (${logType}):`, error);
      return null;
    }
  }
  private async _logRequest(
    logId: string,
    {
      requestMethod,
      requestURL,
      responseStatus,
      responseSize,
      duration,
      payload,
      responseBody,
    }: AuditLogRequestType,
  ) {
    await this.models.auditLogRequestModel.create({
      id: uuidv4(),
      logId: logId,
      requestMethod,
      requestURL,
      responseStatus,
      responseSize,
      duration,
      payload: compressPayload(payload),
      responseBody: compressPayload(sanitizePayload(responseBody)),
      createdAt: new Date(),
    } as CreationAttributes<AuditLogRequestModel>);
  }
  private async _logLogin(
    logId: string,
    userId: string,
    { system }: AuditLogLoginType,
  ) {
    await this.models.auditLogLoginModel.create({
      id: uuidv4(),
      logId: logId,
      userId: userId,
      system: system,
    } as CreationAttributes<AuditLogLoginModel>);
  }
  private async _logIntegration(
    logId: string,
    {
      integrationName,
      method,
      requestPayload,
      responsePayload,
      status,
      duration,
    }: AuditLogHttpIntegrationType,
  ) {
    const requestStr =
      typeof requestPayload === 'string'
        ? requestPayload
        : JSON.stringify(requestPayload ?? '');
    const responseStr =
      typeof responsePayload === 'string'
        ? responsePayload
        : JSON.stringify(responsePayload ?? '');

    await this.models.auditLogIntegrationModel.create({
      id: uuidv4(),
      logId: logId,
      integrationName,
      method,
      requestPayload: compressPayload(requestStr),
      responsePayload: compressPayload(responseStr),
      status,
      duration,
    } as CreationAttributes<AuditLogIntegrationModel>);
  }

  private async _logError(
    logId: string,
    {
      message,
      errorType,
      stackTrace,
      routePath,
      routeMethod,
    }: AuditLogErrorType,
  ) {
    await this.models.auditLogErrorModel.create({
      id: uuidv4(),
      logId: logId,
      errorMessage: message,
      errorType: errorType,
      stackTrace: stackTrace,
      requestPath: routePath,
      requestMethod: routeMethod,
      createdAt: new Date(),
    } as CreationAttributes<AuditLogErrorModel>);
  }

  /**
   * Registra vários logs em lote e devolve os ids gerados (protocolos), na
   * mesma ordem das entradas. Devolve uma lista vazia se a gravação falhar.
   */
  async bulkRegisterLog(
    logType: AuditLogType,
    entries: AuditLogDatabaseType[],
    userInfoOverrides?: Array<{ id: string; ip: string }>,
    logIdOverrides?: string[],
  ): Promise<string[]> {
    if (entries.length === 0) return [];

    try {
      const defaultUserInfo = this.getUserInformation();
      const now = new Date();

      const logs = entries.map((_, index) => ({
        id: logIdOverrides?.[index] || uuidv4(),
        logType,
        userId: userInfoOverrides?.[index]?.id || defaultUserInfo.id,
        ipAddress: userInfoOverrides?.[index]?.ip || defaultUserInfo.ip,
        createdAt: now,
      }));

      await this.models.auditLogModel.bulkCreate(
        logs as CreationAttributes<AuditLogModel>[],
      );

      const entityEntries = entries.map((entry, index) => ({
        id: uuidv4(),
        logId: logs[index].id,
        action: entry.action,
        entity: entry.entity,
        changedValues: sanitizePayload(JSON.stringify(entry.changedValues)),
        entityPk: entry.entityPk ? JSON.stringify(entry.entityPk) : null,
        entityKey: entry.entityKey || null,
        createdAt: now,
      }));

      await this.models.auditLogEntityModel.bulkCreate(
        entityEntries as CreationAttributes<AuditLogEntityModel>[],
      );

      return logs.map((log) => log.id);
    } catch (error) {
      this.logger.error(
        `Error bulk registering audit logs (${logType}):`,
        error,
      );
      return [];
    }
  }

  private async _logEntity(
    logId: string,
    {
      action,
      entity,
      changedValues,
      entityPk,
      entityKey,
    }: AuditLogDatabaseType,
  ) {
    await this.models.auditLogEntityModel.create({
      id: uuidv4(),
      logId: logId,
      action,
      entity: entity,
      changedValues: sanitizePayload(JSON.stringify(changedValues)),
      entityPk: entityPk ? JSON.stringify(entityPk) : null,
      entityKey: entityKey || null,
      createdAt: new Date(),
    } as CreationAttributes<AuditLogEntityModel>);
  }

  private async _logEvent(
    logId: string,
    { type, description, details, eventStatus }: AuditLogEventLogType,
  ) {
    await this.models.auditLogEventModel.create({
      id: uuidv4(),
      logId: logId,
      eventType: type,
      eventDescription: description,
      eventDetails: JSON.stringify(details),
      eventStatus: eventStatus || 'SUCCESS',
    } as CreationAttributes<AuditLogEventModel>);
  }
}
