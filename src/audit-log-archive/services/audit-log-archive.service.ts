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
      const records = await (model as ModelCtor<Model<any, any>>).findAll({
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
        // Cast records to any[] to satisfy bulkCreate, as raw: true returns plain objects
        await (archiveModel as ModelCtor<Model<any, any>>).bulkCreate(
          records as any[],
          {
            ignoreDuplicates: true,
          },
        );

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
        // Decide if you want to break or continue with other tables/batches
        break;
      }
    }
  }

  private async archiveData(
    model: ModelCtor<Model<any, any>>,
    daysToKeep: number,
    archiveTableSuffix: string,
  ) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const recordsToArchive = await (model as any).findAll({
      where: {
        createdAt: {
          [Op.lt]: cutoffDate,
        },
      },
      limit: this.config.batchSize || 1000,
      order: [['createdAt', 'ASC']],
    });

    if (recordsToArchive.length > 0) {
      const archiveTableName = `${(model as any).tableName}_${archiveTableSuffix}`;
      // Ensure you are using the archiveSequelize instance for archive models
      const archiveModelInstance =
        this.archiveSequelize.model(archiveTableName);

      if (archiveModelInstance) {
        // recordsToArchive are already model instances, map to JSON
        await (archiveModelInstance as ModelCtor<Model<any, any>>).bulkCreate(
          recordsToArchive.map((record: Model<any, any>) => record.toJSON()),
          { ignoreDuplicates: true },
        );
        // Add deletion logic for the main database if needed
        const idsToDelete = recordsToArchive.map(
          (r: any) => r[(model as any).primaryKeyAttribute || 'id'],
        );
        await model.destroy({
          where: {
            [(model as any).primaryKeyAttribute || 'id']: {
              [Op.in]: idsToDelete,
            },
          },
        });
        this.logger.log(
          `Archived and deleted ${idsToDelete.length} records from ${model.tableName} (via archiveData).`,
        );
      } else {
        this.logger.warn(
          `Archive model for ${archiveTableName} not found in archiveSequelize instance.`,
        );
      }
    }
  }
}
