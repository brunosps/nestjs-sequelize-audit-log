import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { InjectModel } from '@nestjs/sequelize';

import { v4 as uuidv4 } from 'uuid';
import { AuditLogModel } from '../../audit-log-model/audit-log.model';
import { AuditLogErrorModel } from '../../audit-log-model/audit-log-error.model';

@Injectable()
@Catch()
export class AuditLogErrorLoggingFilter implements ExceptionFilter {
  constructor(
    @InjectModel(AuditLogModel)
    private readonly auditLogModel: typeof AuditLogModel,
    @InjectModel(AuditLogErrorModel)
    private readonly auditLogErrorModel: typeof AuditLogErrorModel,
  ) {}

  async catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const errorLog = {
      id: uuidv4(),
      logId: '', // This will be set after creating the main log
      errorMessage: (exception as any)?.message || 'Internal server error',
      errorStack: (exception as any)?.stack || '',
      requestUrl: request.url || '',
      requestMethod: request.method || '',
      requestParams: JSON.stringify(request.params) || '{}',
      requestBody: JSON.stringify(request.body) || '{}',
      responseStatus: status,
      createdAt: new Date(),
    };

    try {
      const log = await (this.auditLogModel as any).create({
        id: uuidv4(),
        logType: 'ERROR',
        userId: request['user']?.id || 'anonymous',
        ipAddress: request.ip || 'unknown',
        createdAt: new Date(),
      });

      errorLog.logId = log.id;

      await (this.auditLogErrorModel as any).create(errorLog);
    } catch (error) {
      console.error('Error saving error log:', error);
    }

    response.status(status).json({
      statusCode: status,
      message: 'An unexpected error occurred.',
    });
  }
}
