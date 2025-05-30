import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Injectable,
  Inject,
  Optional,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { InjectModel } from '@nestjs/sequelize';
import { CreationAttributes } from 'sequelize';

import { v4 as uuidv4 } from 'uuid';
import { AuditLogModel } from '../../audit-log-model/audit-log.model';
import { AuditLogErrorModel } from '../../audit-log-model/audit-log-error.model';
import { extractClientIp } from '../../utils/ip';
import { AuditLogGetInfoFromRequest } from '../../interfaces/audit-log-module-options.interface';

@Injectable()
@Catch()
export class AuditLogErrorLoggingFilter implements ExceptionFilter {
  constructor(
    @InjectModel(AuditLogModel)
    private readonly auditLogModel: typeof AuditLogModel,
    @InjectModel(AuditLogErrorModel)
    private readonly auditLogErrorModel: typeof AuditLogErrorModel,
    @Optional()
    @Inject('GET_USERID_FUNCTION')
    private getUserIdFn?: AuditLogGetInfoFromRequest,
    @Optional()
    @Inject('GET_IPADDRESS_FUNCTION')
    private getIpAddressFn?: AuditLogGetInfoFromRequest,
  ) {}

  async catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';
    const errorType =
      exception instanceof Error ? exception.constructor.name : 'UnknownError';
    const stackTrace =
      exception instanceof Error && exception.stack ? exception.stack : '';

    try {
      const userInformation = {
        id: String(req['user']?.id || '_'),
        ip: extractClientIp(req),
      };

      if (this.getUserIdFn) {
        userInformation.id = this.getUserIdFn(req);
      }

      if (this.getIpAddressFn) {
        userInformation.ip = this.getIpAddressFn(req);
      }

      const routePath = req.route?.path || req.url || '';
      const routeMethod = req.route?.methods
        ? Object.keys(req.route.methods)
            .filter((method) => req.route.methods[method])
            .map((method) => method.toUpperCase())
            .join('|')
        : req.method || '';

      const auditLogAttributes = {
        id: uuidv4(),
        logType: 'ERROR',
        ipAddress: userInformation.ip,
        userId: userInformation.id,
        createdAt: new Date(),
      };

      const auditLog = await this.auditLogModel.create(
        auditLogAttributes as CreationAttributes<AuditLogModel>,
      );

      await this.auditLogErrorModel.create({
        id: uuidv4(),
        logId: auditLog.id,
        errorMessage: JSON.stringify(message),
        errorType: errorType,
        stackTrace: stackTrace,
        requestPath: routePath,
        requestMethod: routeMethod,
        createdAt: new Date(),
      } as CreationAttributes<AuditLogErrorModel>);
    } catch (error) {
      console.error('Error saving error log:', error);
    }

    res.status(status).json(message);
  }
}
