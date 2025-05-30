import { Inject, Injectable, NestMiddleware, Optional } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { InjectModel } from '@nestjs/sequelize';
import { CreationAttributes } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import { AuditLogModel } from '../../audit-log-model/audit-log.model';
import { AuditLogRequestModel } from '../../audit-log-model/audit-log-request.model';
import { sanitizePayload } from '../utils/sanitizePayload';
import {
  AuditLogGetInfoFromRequest,
  AuditLogRequestAuthRoute,
} from '../../interfaces/audit-log-module-options.interface';
import { extractClientIp } from '../../utils/ip';
import { AuditLogLoginModel } from '../../audit-log-model/audit-log-login.model';

@Injectable()
export class AuditLogRequestLoggingMiddleware implements NestMiddleware {
  constructor(
    @InjectModel(AuditLogModel)
    private auditLogModel: typeof AuditLogModel,
    @InjectModel(AuditLogRequestModel)
    private auditLogRequestModel: typeof AuditLogRequestModel,
    @InjectModel(AuditLogLoginModel)
    private auditLogLoginModel: typeof AuditLogLoginModel,
    @Optional()
    @Inject('AUTH_ROUTES')
    private authRoutes: AuditLogRequestAuthRoute[],
    @Optional()
    @Inject('GET_USERID_FUNCTION')
    private getUserIdFn?: AuditLogGetInfoFromRequest,
    @Optional()
    @Inject('GET_IPADDRESS_FUNCTION')
    private getIpAddressFn?: AuditLogGetInfoFromRequest,
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
        const data = {
          id: String(req['user']?.id || '_'),
          ip: extractClientIp(req),
          logType: isLoginPath ? 'LOGIN' : 'REQUEST',
        };

        if (this.getUserIdFn) {
          data.id = this.getUserIdFn(req);
        }

        if (isLoginPath && isLoginPath.getUserId) {
          data.id = isLoginPath.getUserId(JSON.parse(responseBody));
        }

        if (this.getIpAddressFn) {
          data.ip = this.getIpAddressFn(req);
        }

        const log = await this.auditLogModel.create({
          id: uuidv4(),
          logType: data.logType,
          ipAddress: data.ip,
          userId: data.id,
          createdAt: new Date(),
        } as CreationAttributes<AuditLogModel>);

        if (isLoginPath) {
          await this.auditLogLoginModel.create({
            id: uuidv4(),
            userId: data.id,
            logId: log.id,
            system: isLoginPath.system,
          } as CreationAttributes<AuditLogLoginModel>);
        }

        if (!isLoginPath || isLoginPath.registerRequest) {
          await this.auditLogRequestModel.create({
            id: uuidv4(),
            logId: log.id,
            requestMethod: req.method,
            requestURL: req.originalUrl,
            responseStatus: res.statusCode,
            responseSize: parseInt(res.get('Content-Length') || '0', 10),
            duration: duration,
            payload: payload,
            responseBody: responseBody ? responseBody : undefined,
            createdAt: new Date(),
          } as CreationAttributes<AuditLogRequestModel>);
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
