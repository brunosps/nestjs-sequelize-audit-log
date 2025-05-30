import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Injectable,
  Inject,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { InjectModel } from '@nestjs/sequelize';

import { AuditLogModel } from '../../audit-log-model/audit-log.model';
import { AuditLogErrorModel } from '../../audit-log-model/audit-log-error.model';
import { AuditLogService } from '../../audit-log-core/services/audit-log.service';

export type AuditLogErrorType = {
  message: string;
  errorType: string;
  stackTrace: string;
  routePath: string;
  routeMethod: string;
};
@Injectable()
@Catch()
export class AuditLogErrorLoggingFilter implements ExceptionFilter {
  constructor(
    @Inject(AuditLogService)
    private readonly auditLogService: AuditLogService,
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
      const routePath = req.route?.path || req.url || '';
      const routeMethod = req.route?.methods
        ? Object.keys(req.route.methods)
            .filter((method) => req.route.methods[method])
            .map((method) => method.toUpperCase())
            .join('|')
        : req.method || '';

      this.auditLogService.registerLog('ERROR', {
        message: JSON.stringify(message),
        errorType,
        stackTrace,
        routePath,
        routeMethod,
      });
    } catch (error) {
      console.error('Error saving error log:', error);
    }

    res.status(status).json(message);
  }
}
