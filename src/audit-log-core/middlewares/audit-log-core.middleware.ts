// src/common/middleware/user-session.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Response, NextFunction } from 'express';

import { AuditLogService } from '../services/audit-log.service';
import { AuditLogRequest } from '../../interfaces/audit-log-module-options.interface';

@Injectable()
export class AuditLogCoreMiddleware implements NestMiddleware {
  use(req: AuditLogRequest, res: Response, next: NextFunction) {
    AuditLogService.runWithRequest(req, () => {
      next();
    });
  }
}
