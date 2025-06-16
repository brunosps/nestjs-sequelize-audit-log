import { Inject, Injectable, Logger } from '@nestjs/common';
import { Op } from 'sequelize';
import type { Model, ModelCtor, Sequelize } from 'sequelize-typescript';

import { AuditLogArchiveConfig } from '../audit-log-archive.module';

@Injectable()
export class AuditLogArchiveService {
  private readonly logger = new Logger(AuditLogArchiveService.name);
  private models: (typeof Model)[];
  private archiveModels: (typeof Model)[];
  private archivedRecords: Map<string, { model: typeof Model; ids: any[] }> =
    new Map();
  private archiveSuccess: Map<string, boolean> = new Map();

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
    const parentTables = ['audit_logs'];

    const childTables = [
      'audit_logs_details',
      'audit_logs_entity',
      'audit_logs_error',
      'audit_logs_event',
      'audit_logs_integration',
      'audit_logs_login',
      'audit_logs_request',
    ];

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.logRetentionDays);

    this.archivedRecords.clear();
    this.archiveSuccess.clear();

    for (const table of parentTables) {
      const model = this.getModelByTableName(this.models, table);
      await this.archiveModelData(model, cutoffDate);
    }

    for (const table of childTables) {
      const model = this.getModelByTableName(this.models, table);
      await this.archiveModelData(model, cutoffDate);
    }

    await this.deleteArchivedRecords();
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
    const allIds: any[] = [];

    const isChildTable = tableName !== 'audit_logs';

    if (isChildTable) {
      const auditLogIds = await this.getAuditLogIdsToArchive(cutoffDate);

      if (auditLogIds.length === 0) {
        this.archivedRecords.set(tableName, { model, ids: [] });
        this.archiveSuccess.set(tableName, true);
        this.logger.log(`No records to archive for ${tableName}`);
        return;
      }

      const batchSize = this.config.batchSize || 1000;
      for (let i = 0; i < auditLogIds.length; i += batchSize) {
        const batch = auditLogIds.slice(i, i + batchSize);

        const records: Record<string, any>[] = await (
          model as ModelCtor<Model<any, any>>
        ).findAll({
          where: {
            log_id: {
              [Op.in]: batch,
            },
          },
          raw: true,
        });

        if (records.length > 0) {
          const archiveModel = this.getModelByTableName(
            this.archiveModels,
            tableName,
          );

          try {
            await (archiveModel as ModelCtor<Model<any, any>>).bulkCreate(
              records,
              {
                ignoreDuplicates: true,
              },
            );

            const idsToDelete = records.map((r: any) => r[primaryKey]);
            allIds.push(...idsToDelete);

            this.logger.log(
              `Archived ${idsToDelete.length} records from ${tableName}.`,
            );
          } catch (error) {
            this.logger.error(
              `Error archiving data for table ${tableName}:`,
              error,
            );
            this.archiveSuccess.set(tableName, false);
            return;
          }
        }
      }
    } else {
      const records: Record<string, any>[] = await (
        model as ModelCtor<Model<any, any>>
      ).findAll({
        where: {
          createdAt: {
            [Op.lt]: cutoffDate,
          },
        },
        raw: true,
      });

      if (records.length > 0) {
        const archiveModel = this.getModelByTableName(
          this.archiveModels,
          tableName,
        );

        try {
          const batchSize = this.config.batchSize || 1000;
          for (let i = 0; i < records.length; i += batchSize) {
            const batch = records.slice(i, i + batchSize);

            await (archiveModel as ModelCtor<Model<any, any>>).bulkCreate(
              batch,
              {
                ignoreDuplicates: true,
              },
            );
          }

          const idsToDelete = records.map((r: any) => r[primaryKey]);
          allIds.push(...idsToDelete);

          this.logger.log(
            `Archived ${records.length} records from ${tableName}.`,
          );
        } catch (error) {
          this.logger.error(
            `Error archiving data for table ${tableName}:`,
            error,
          );
          this.archiveSuccess.set(tableName, false);
          return;
        }
      }
    }

    this.archivedRecords.set(tableName, { model, ids: allIds });
    this.archiveSuccess.set(tableName, true);
    this.logger.log(`Successfully archived all records for ${tableName}`);
  }

  private async getAuditLogIdsToArchive(cutoffDate: Date): Promise<string[]> {
    const auditLogModel = this.getModelByTableName(this.models, 'audit_logs');

    const records = await (auditLogModel as ModelCtor<Model<any, any>>).findAll(
      {
        where: {
          createdAt: {
            [Op.lt]: cutoffDate,
          },
        },
        attributes: ['id'],
        raw: true,
      },
    );

    return records.map((r: any) => r.id);
  }

  private async deleteArchivedRecords(): Promise<void> {
    const allSuccess = Array.from(this.archiveSuccess.values()).every(
      (success) => success,
    );

    if (!allSuccess) {
      this.logger.error('Some archives failed. Skipping deletion phase.');
      return;
    }

    this.logger.log('All archives successful. Starting deletion phase...');

    const deletionOrder = [
      'audit_logs_details',
      'audit_logs_entity',
      'audit_logs_error',
      'audit_logs_event',
      'audit_logs_integration',
      'audit_logs_login',
      'audit_logs_request',
      'audit_logs',
    ];

    for (const tableName of deletionOrder) {
      const recordData = this.archivedRecords.get(tableName);
      if (!recordData || recordData.ids.length === 0) {
        this.logger.log(`No records to delete for ${tableName}`);
        continue;
      }

      const { model, ids } = recordData;

      try {
        const primaryKey = model.primaryKeyAttribute;

        const batchSize = this.config.batchSize || 1000;
        for (let i = 0; i < ids.length; i += batchSize) {
          const batch = ids.slice(i, i + batchSize);

          await (model as ModelCtor<Model<any, any>>).destroy({
            where: {
              [primaryKey]: {
                [Op.in]: batch,
              },
            },
          });
        }

        this.logger.log(`Deleted ${ids.length} records from ${tableName}`);
      } catch (error) {
        this.logger.error(`Error deleting records from ${tableName}:`, error);
      }
    }

    this.logger.log('Archive and deletion process completed');
  }
}
