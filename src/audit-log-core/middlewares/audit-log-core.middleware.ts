// src/common/middleware/user-session.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Response } from 'express';

import { AuditLogRequest } from '../../interfaces/audit-log-module-options.interface';
import { AuditLogService } from '../services/audit-log.service';

@Injectable()
export class AuditLogCoreMiddleware implements NestMiddleware {
  use(req: AuditLogRequest, res: Response, next: NextFunction) {
    AuditLogService.runWithRequest(req, () => {
      next();
    });
  }
}
