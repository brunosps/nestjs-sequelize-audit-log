import { Inject, Injectable, Logger } from '@nestjs/common';
import { Op } from 'sequelize';
import type { Model, ModelCtor, Sequelize } from 'sequelize-typescript';

import { AuditLogArchiveConfig } from '../audit-log-archive.module';

@Injectable()
export class AuditLogArchiveService {
  private readonly logger = new Logger(AuditLogArchiveService.name);
  private models: (typeof Model)[];
  private archiveModels: (typeof Model)[];

  constructor(
    @Inject('AUDIT_LOG_CONFIG')
    private readonly config: AuditLogArchiveConfig,
    @Inject('MAIN_SEQUELIZE')
    private readonly sequelize: Sequelize,
    @Inject('ARCHIVE_SEQUELIZE')
    private readonly archiveSequelize: Sequelize,
  ) {
    this.models = Object.entries(this.sequelize.models).map(
      (arr) => arr[1] as unknown as typeof Model,
    );
    this.archiveModels = Object.entries(this.archiveSequelize.models).map(
      (arr) => arr[1] as unknown as typeof Model,
    );
  }

  async execute(): Promise<void> {
    const tablesToArchive = [
      'audit_logs',
      'audit_logs_entity',
      'audit_logs_error',
      'audit_logs_request',
      'audit_logs_event',
      'audit_logs_integration',
    ];
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionPeriod);

    for (const table of tablesToArchive) {
      const model = this.getModelByTableName(this.models, table);
      await this.archiveModelData(model, cutoffDate);
    }
  }

  private getModelByTableName(models: (typeof Model)[], tableName: string) {
    const model = models.find(
      (model) => model.tableName.toUpperCase() === tableName.toUpperCase(),
    );

    if (!model) {
      throw new Error(`Model not found for table: ${tableName}`);
    }

    return model;
  }

  private async archiveModelData(
    model: typeof Model,
    cutoffDate: Date,
  ): Promise<void> {
    const tableName = model.tableName;
    const primaryKey = model.primaryKeyAttribute;

    while (true) {
      const records: Record<string, any>[] = await (
        model as ModelCtor<Model<any, any>>
      ).findAll({
        where: {
          createdAt: {
            [Op.lt]: cutoffDate,
          },
        },
        limit: this.config.batchSize,
        order: [[primaryKey, 'ASC']],
        raw: true,
      });

      if (records.length === 0) {
        break;
      }

      const archiveModel = this.getModelByTableName(
        this.archiveModels,
        tableName,
      );

      try {
        await (archiveModel as ModelCtor<Model<any, any>>).bulkCreate(records, {
          ignoreDuplicates: true,
        });

        const idsToDelete = records.map((r: any) => r[primaryKey]);
        await (model as ModelCtor<Model<any, any>>).destroy({
          where: {
            [primaryKey]: {
              [Op.in]: idsToDelete,
            },
          },
        });
        this.logger.log(
          `Archived and deleted ${idsToDelete.length} records from ${tableName}.`,
        );
      } catch (error) {
        this.logger.error(
          `Error archiving data for table ${tableName}:`,
          error,
        );
        break;
      }
    }
  }
}
