// src/common/middleware/user-session.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { InjectConnection } from '@nestjs/sequelize';
import { Request, Response, NextFunction } from 'express';
import { Sequelize } from 'sequelize';

@Injectable()
export class AuditLogUserSessionMiddleware implements NestMiddleware {
  private auditLogDatabaseService: any;

  constructor(@InjectConnection() private readonly sequelize: Sequelize) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const userId = req['user']?.id ?? 'guest';
    // Use a default empty string if req.ip is undefined
    const userIp = (req.ip || '0.0.0.0').replace(/^::ffff:/, '') ?? '0.0.0.0';

    try {
      await this.sequelize.query(
        `SET @user_id = '${userId}', @user_ip = '${userIp}'`,
      );
    } catch (error) {
      console.error('Failed to set user session in MySQL:', error);
    }

    this.auditLogDatabaseService.setUser({
      id: req.user?.id || 'anonymous',
      ipAddress: req.ip || 'unknown',
    });

    next();
  }
}
