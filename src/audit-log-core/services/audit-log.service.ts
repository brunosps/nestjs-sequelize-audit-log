import { Inject, Injectable, Optional } from '@nestjs/common';
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
import { extractClientIp } from '../../utils/ip';
import { sanitizePayload } from '../../utils/sanitizePayload';

import { PayloadDetailsService } from './payload-details.service';

type AuditLogType =
  | 'ENTITY'
  | 'REQUEST'
  | 'ERROR'
  | 'EVENT'
  | 'LOGIN'
  | 'INTEGRATION';
type AuditLogDataType =
  | AuditLogEventLogType
  | AuditLogDatabaseType
  | AuditLogErrorType
  | AuditLogHttpIntegrationType
  | AuditLogLoginType
  | AuditLogRequestType;

@Injectable()
export class AuditLogService {
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
  ) {}

  private static readonly asyncLocalStorage =
    new AsyncLocalStorage<AuditLogRequest>();

  static runWithRequest<T>(req: AuditLogRequest, callback: () => T): T {
    return this.asyncLocalStorage.run(req, callback);
  }

  private getCurrentRequest(): AuditLogRequest | undefined {
    return AuditLogService.asyncLocalStorage.getStore();
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

    await this.auditLogErrorModel.destroy({
      where: {
        createdAt: {
          [Op.lt]: cutoffDate,
        },
      },
    });

    await this.auditLogIntegrationModel.destroy({
      where: {
        createdAt: {
          [Op.lt]: cutoffDate,
        },
      },
    });

    await this.auditLogRequestModel.destroy({
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

    await this.auditLogDetailModel.destroy({
      where: {
        createdAt: {
          [Op.lt]: cutoffDate,
        },
      },
    });

    await this.auditLogModel.destroy({
      where: {
        createdAt: {
          [Op.lt]: cutoffDate,
        },
      },
    });
  }

  async logEvent(data: AuditLogEventLogType) {
    this.registerLog('EVENT', data);
  }

  async registerLog(logType: AuditLogType, data: AuditLogDataType) {
    const userInformation = this.getUserInformation();

    const log = await this.auditLogModel.create({
      id: uuidv4(),
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
        await this._logIntegration(log.id, data as AuditLogHttpIntegrationType);
        break;
      case 'REQUEST':
        await this._logRequest(log.id, data as AuditLogRequestType);
        break;
      case 'LOGIN':
        data = data as AuditLogLoginType;
        log.userId = data.userId || userInformation.id;
        log.save();
        await this._logLogin(log.id, log.userId, data as AuditLogLoginType);
        if (data.registerRequest) {
          await this._logRequest(log.id, data.request as AuditLogRequestType);
        }
        break;

      default:
        break;
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
    await this.auditLogRequestModel.create({
      id: uuidv4(),
      logId: logId,
      requestMethod,
      requestURL,
      responseStatus,
      responseSize,
      duration,
      payload,
      responseBody: sanitizePayload(responseBody),
      createdAt: new Date(),
    } as CreationAttributes<AuditLogRequestModel>);
  }
  private async _logLogin(
    logId: string,
    userId: string,
    { system }: AuditLogLoginType,
  ) {
    await this.auditLogLoginModel.create({
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
    const chunkGroupId = uuidv4();
    const context = {
      logId,
      chunkGroupId,
      integrationName,
      method,
      userId: this.getUserInformation().id,
    };

    const processedRequestPayload =
      await this.payloadDetailsService.processPayload(
        chunkGroupId,
        requestPayload,
        'request',
        'INTEGRATION',
        context,
      );

    const processedResponsePayload =
      await this.payloadDetailsService.processPayload(
        chunkGroupId,
        responsePayload,
        'response',
        'INTEGRATION',
        context,
      );

    await this.auditLogIntegrationModel.create({
      id: chunkGroupId,
      logId: logId,
      integrationName,
      method,
      requestPayload: processedRequestPayload,
      responsePayload: processedResponsePayload,
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
    await this.auditLogErrorModel.create({
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
    await this.auditLogEntityModel.create({
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
    { type, description, details }: AuditLogEventLogType,
  ) {
    await this.auditLogEventModel.create({
      id: uuidv4(),
      logId: logId,
      eventType: type,
      eventDescription: description,
      eventDetails: JSON.stringify(details),
    } as CreationAttributes<AuditLogEventModel>);
  }
}
