import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AuditLogHttpService } from '../services/audit-log-http.service';
import { AuditLogRequest } from '../../interfaces/audit-log-module-options.interface';

@Injectable()
export class AuditLogContextMiddleware implements NestMiddleware {
  use(req: AuditLogRequest, res: Response, next: NextFunction) {
    AuditLogHttpService.runWithRequest(req, () => {
      next();
    });
  }
}
