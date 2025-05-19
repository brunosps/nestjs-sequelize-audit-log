import { Inject, Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { InjectModel } from '@nestjs/sequelize';
import { v4 as uuid } from 'uuid';
import { AuditLogModel } from '../../audit-log-model/audit-log.model';
import { AuditLogRequestModel } from '../../audit-log-model/audit-log-request.model';
import { sanitizePayload } from '../utils/sanitizePayload';
import { responseCache } from '../../utils/response-cache.util';

@Injectable()
export class AuditLogRequestLoggingMiddleware implements NestMiddleware {
  private responseBodyCache = responseCache;

  constructor(
    @InjectModel(AuditLogModel) private auditLogModel: typeof AuditLogModel,
    @InjectModel(AuditLogRequestModel)
    private auditLogRequestModel: typeof AuditLogRequestModel,
    @Inject('AUTH_ROUTE') private authRoute: string, // Changed type to string
  ) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const start = Date.now();

    const payload =
      req.body && Object.keys(req.body).length > 0
        ? JSON.stringify(sanitizePayload(req.body))
        : null;

    // Gera um ID único para esta requisição
    const requestId = uuid();

    // Guarda os chunks em um array
    const responseChunks: Buffer[] = [];

    const originalWrite = res.write;
    const originalEnd = res.end;

    // Override para capturar os dados da resposta
    res.write = (chunk: any, ...args: any[]): boolean => {
      if (chunk) {
        // Converte para Buffer se necessário
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        responseChunks.push(buffer);
      }
      return originalWrite.apply(res, [chunk, ...args] as any);
    };

    // Use an arrow function for res.end to preserve 'this' context of the middleware
    res.end = (...args: any[]): Response => {
      const chunk = args[0];
      if (chunk) {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        responseChunks.push(buffer);
      }

      const bufferBody = Buffer.concat(responseChunks);
      const responseBody =
        bufferBody.length > 0 ? bufferBody.toString('utf-8') : '';

      setTimeout(async () => {
        try {
          const log = await (this.auditLogModel as any).create({
            id: uuid(),
            // Use this.authRoute directly as it's now a string
            logType: req.path === this.authRoute ? 'LOGIN' : 'REQUEST',
            ipAddress: req.ip || 'unknown',
            userId: req.user?.id || 'anonymous',
            createdAt: new Date(),
          });

          // Cria log de requisição
          await (this.auditLogRequestModel as any).create({
            id: uuid(),
            logId: log.id,
            method: req.method,
            url: req.originalUrl || req.url,
            headers: JSON.stringify(req.headers),
            body: payload || undefined,
            userAgent: req.headers['user-agent'] || undefined,
            requestTime: start,
            responseTime: Date.now(),
            responseStatus: res.statusCode,
            responseBody: responseBody || undefined,
            createdAt: new Date(),
          });
        } catch (error) {
          console.error('Erro ao salvar log de requisição:', error);
        }
      }, 0);

      return originalEnd.apply(res, args as any);
    };

    next();
  }
}
