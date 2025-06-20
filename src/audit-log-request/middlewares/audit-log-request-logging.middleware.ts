import { Inject, Injectable, NestMiddleware, Optional } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

import { AuditLogService } from '../../audit-log-core/services/audit-log.service';
import { AuditLogRequestAuthRoute } from '../../interfaces/audit-log-module-options.interface';
import { sanitizePayload } from '../../utils/sanitizePayload';

export type AuditLogRequestType = {
  requestMethod: string;
  requestURL: string;
  responseStatus: number;
  responseSize: number;
  duration: number;
  payload: string;
  responseBody?: string;
};

export type AuditLogLoginType = {
  system: string;
  registerRequest: boolean;
  userId?: string;
  request?: AuditLogRequestType;
};

@Injectable()
export class AuditLogRequestLoggingMiddleware implements NestMiddleware {
  constructor(
    @Optional()
    @Inject('AUTH_ROUTES')
    private authRoutes: AuditLogRequestAuthRoute[],
    @Inject(AuditLogService)
    private readonly auditLogService: AuditLogService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const start = Date.now();

    const payload =
      req.body && Object.keys(req.body).length > 0
        ? JSON.stringify(sanitizePayload(req.body))
        : '';

    const originalWrite = res.write;
    const originalEnd = res.end;
    const responseChunks: Buffer[] = [];

    res.write = function (chunk: any, encoding?: any, callback?: any): boolean {
      if (chunk) {
        responseChunks.push(
          Buffer.isBuffer(chunk)
            ? chunk
            : Buffer.from(
                chunk,
                typeof encoding === 'string'
                  ? (encoding as BufferEncoding)
                  : 'utf8',
              ),
        );
      }
      return originalWrite.call(this, chunk, encoding, callback);
    };

    res.end = function (chunk?: any, encoding?: any, callback?: any): any {
      if (chunk) {
        responseChunks.push(
          Buffer.isBuffer(chunk)
            ? chunk
            : Buffer.from(
                chunk,
                typeof encoding === 'string'
                  ? (encoding as BufferEncoding)
                  : 'utf8',
              ),
        );
      }
      return originalEnd.call(this, chunk, encoding, callback);
    };

    res.on('finish', async () => {
      const duration = Date.now() - start;
      const responseBody = Buffer.concat(responseChunks).toString('utf8');
      try {
        const isLoginPath = this.isLoginPath(req);
        const request: AuditLogRequestType = {
          requestMethod: req.method,
          requestURL: req.originalUrl,
          responseStatus: res.statusCode,
          responseSize: parseInt(res.get('Content-Length') || '0', 10),
          duration: duration,
          payload: payload,
          responseBody: responseBody ? responseBody : undefined,
        };

        if (isLoginPath && res.statusCode >= 200 && res.statusCode < 300) {
          const data: AuditLogLoginType = {
            system: isLoginPath.system,
            registerRequest: !!isLoginPath.registerRequest,
            request: request,
          };

          if (isLoginPath.getUserId) {
            data.userId = isLoginPath.getUserId(JSON.parse(responseBody));
          }
          this.auditLogService.registerLog('LOGIN', data);
        } else {
          this.auditLogService.registerLog('REQUEST', request);
        }
      } catch (error) {
        console.error('Error logging request:', error);
      }
    });

    next();
  }

  private isLoginPath(req: Request): AuditLogRequestAuthRoute | false {
    if (
      !this.authRoutes ||
      !Array.isArray(this.authRoutes) ||
      this.authRoutes.length === 0
    ) {
      return false;
    }
    const foundRoute = this.authRoutes.find((route) => {
      if (
        route &&
        typeof route.path === 'string' &&
        Array.isArray(route.methods)
      ) {
        return (
          req.originalUrl === route.path && route.methods.includes(req.method)
        );
      }
      return false;
    });

    return foundRoute || false;
  }
}
