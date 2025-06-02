import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';

import { AuditLogModel } from './audit-log.model';
import { AuditLogEntityModel } from './audit-log-entity.model';
import { AuditLogErrorModel } from './audit-log-error.model';
import { AuditLogEventModel } from './audit-log-event.model';
import { AuditLogIntegrationModel } from './audit-log-integration.model';
import { AuditLogLoginModel } from './audit-log-login.model';
import { AuditLogRequestModel } from './audit-log-request.model';

@Module({
  imports: [
    SequelizeModule.forFeature([
      AuditLogModel,
      AuditLogEntityModel,
      AuditLogRequestModel,
      AuditLogLoginModel,
      AuditLogErrorModel,
      AuditLogEventModel,
      AuditLogIntegrationModel,
    ]),
  ],
  exports: [SequelizeModule],
})
export class AuditLogModelModule {}
