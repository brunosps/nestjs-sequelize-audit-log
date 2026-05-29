import { Provider } from '@nestjs/common';
import { getModelToken } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';

import { AuditLogModel } from '../../audit-log-model/audit-log.model';
import { AuditLogDetailModel } from '../../audit-log-model/audit-log-detail.model';
import { AuditLogEntityModel } from '../../audit-log-model/audit-log-entity.model';
import { AuditLogErrorModel } from '../../audit-log-model/audit-log-error.model';
import { AuditLogEventModel } from '../../audit-log-model/audit-log-event.model';
import { AuditLogIntegrationModel } from '../../audit-log-model/audit-log-integration.model';
import { AuditLogLoginModel } from '../../audit-log-model/audit-log-login.model';
import { AuditLogRequestModel } from '../../audit-log-model/audit-log-request.model';

export const AUDIT_LOG_MODELS = 'AUDIT_LOG_MODELS';

export type AuditLogModelSet = {
  auditLogModel: typeof AuditLogModel;
  auditLogEventModel: typeof AuditLogEventModel;
  auditLogEntityModel: typeof AuditLogEntityModel;
  auditLogErrorModel: typeof AuditLogErrorModel;
  auditLogIntegrationModel: typeof AuditLogIntegrationModel;
  auditLogRequestModel: typeof AuditLogRequestModel;
  auditLogLoginModel: typeof AuditLogLoginModel;
  auditLogDetailModel: typeof AuditLogDetailModel;
};

function resolveAuditModel<T>(
  sequelize: Sequelize,
  modelClass: T & { name: string; tableName: string },
): T {
  const modelByName = sequelize.models[modelClass.name] as unknown as
    | T
    | undefined;
  if (modelByName) return modelByName;

  const modelByTable = Object.values(sequelize.models).find(
    (model) => model.tableName === modelClass.tableName,
  ) as unknown as T | undefined;

  if (!modelByTable) {
    throw new Error(
      `Audit model not registered in dedicated Sequelize pool: ${modelClass.tableName}`,
    );
  }

  return modelByTable;
}

export function createAuditLogModelsProvider(): Provider {
  return {
    provide: AUDIT_LOG_MODELS,
    useFactory: (
      auditSequelize: Sequelize | null | undefined,
      auditLogModel: typeof AuditLogModel,
      auditLogEventModel: typeof AuditLogEventModel,
      auditLogEntityModel: typeof AuditLogEntityModel,
      auditLogErrorModel: typeof AuditLogErrorModel,
      auditLogIntegrationModel: typeof AuditLogIntegrationModel,
      auditLogRequestModel: typeof AuditLogRequestModel,
      auditLogLoginModel: typeof AuditLogLoginModel,
      auditLogDetailModel: typeof AuditLogDetailModel,
    ): AuditLogModelSet => {
      if (!auditSequelize) {
        return {
          auditLogModel,
          auditLogEventModel,
          auditLogEntityModel,
          auditLogErrorModel,
          auditLogIntegrationModel,
          auditLogRequestModel,
          auditLogLoginModel,
          auditLogDetailModel,
        };
      }

      return {
        auditLogModel: resolveAuditModel(auditSequelize, AuditLogModel),
        auditLogEventModel: resolveAuditModel(
          auditSequelize,
          AuditLogEventModel,
        ),
        auditLogEntityModel: resolveAuditModel(
          auditSequelize,
          AuditLogEntityModel,
        ),
        auditLogErrorModel: resolveAuditModel(
          auditSequelize,
          AuditLogErrorModel,
        ),
        auditLogIntegrationModel: resolveAuditModel(
          auditSequelize,
          AuditLogIntegrationModel,
        ),
        auditLogRequestModel: resolveAuditModel(
          auditSequelize,
          AuditLogRequestModel,
        ),
        auditLogLoginModel: resolveAuditModel(
          auditSequelize,
          AuditLogLoginModel,
        ),
        auditLogDetailModel: resolveAuditModel(
          auditSequelize,
          AuditLogDetailModel,
        ),
      };
    },
    inject: [
      { token: 'AUDIT_SEQUELIZE', optional: true },
      getModelToken(AuditLogModel),
      getModelToken(AuditLogEventModel),
      getModelToken(AuditLogEntityModel),
      getModelToken(AuditLogErrorModel),
      getModelToken(AuditLogIntegrationModel),
      getModelToken(AuditLogRequestModel),
      getModelToken(AuditLogLoginModel),
      getModelToken(AuditLogDetailModel),
    ],
  };
}
