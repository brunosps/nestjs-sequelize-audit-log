import { Inject, Injectable, Logger } from '@nestjs/common';
import { Op } from 'sequelize';
import type { Model, ModelCtor, Sequelize } from 'sequelize-typescript';

import { AuditLogArchiveConfig } from '../audit-log-archive.module';

@Injectable()
export class AuditLogArchiveService {
  private readonly logger = new Logger(AuditLogArchiveService.name);
  private models: (typeof Model)[];
  private archiveModels: (typeof Model)[];
  private archivedRecords: Map<string, { model: typeof Model; count: number }> =
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

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.archiveCutoffDays);

    this.archivedRecords.clear();
    this.archiveSuccess.clear();

    for (const table of parentTables) {
      const model = this.getModelByTableName(this.models, table);
      await this.archiveModelData(model, cutoffDate);
    }

    this.logger.log('🎉 Archive process completed successfully');
  }

  async clearLogs(model: typeof Model, filter = {}) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.archiveRetentionDays);
    await (model as ModelCtor<Model<any, any>>).destroy({
      where: {
        createdAt: {
          [Op.lt]: cutoffDate,
        },
        ...filter,
      },
    });
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

    if (tableName !== 'audit_logs') {
      this.logger.log(
        `⚠️ Skipping ${tableName} - child tables are now processed per batch`,
      );
      return;
    }

    this.logger.log(`🔄 Starting cursor-based processing for ${tableName}`);

    const batchSize = Math.min(this.config.batchSize || 1000, 500);
    let lastCursor: { createdAt: Date; id: any } | null = null;
    let hasMoreRecords = true;
    let totalProcessed = 0;

    const archiveModel = this.getModelByTableName(
      this.archiveModels,
      tableName,
    );

    while (hasMoreRecords) {
      this.logger.log(
        `📊 Processing batch with cursor after ${
          lastCursor
            ? `${lastCursor.createdAt.toISOString()} / ${lastCursor.id}`
            : 'start'
        } for ${tableName}`,
      );

      let currentBatchRecords: Record<string, any>[] = [];

      try {
        let whereCondition: any = {
          createdAt: {
            [Op.lt]: cutoffDate,
          },
        };

        if (lastCursor) {
          whereCondition = {
            [Op.and]: [
              {
                createdAt: {
                  [Op.lt]: cutoffDate,
                },
              },
              {
                [Op.or]: [
                  {
                    createdAt: {
                      [Op.gt]: lastCursor.createdAt,
                    },
                  },
                  {
                    createdAt: lastCursor.createdAt,
                    [primaryKey]: {
                      [Op.gt]: lastCursor.id,
                    },
                  },
                ],
              },
            ],
          };
        }

        currentBatchRecords = await (
          model as ModelCtor<Model<any, any>>
        ).findAll({
          where: whereCondition,
          limit: batchSize,
          order: [
            ['createdAt', 'ASC'],
            [primaryKey, 'ASC'],
          ],
          raw: true,
        });

        if (currentBatchRecords.length === 0) {
          hasMoreRecords = false;
          this.logger.log(
            `✅ No more records found for ${tableName}. Total processed: ${totalProcessed}`,
          );
          break;
        }

        this.logger.log(
          `📝 Found ${currentBatchRecords.length} records in current batch for ${tableName}`,
        );

        const existingIds = await this.getExistingIdsInArchiveBatched(
          archiveModel,
          primaryKey,
          currentBatchRecords.map((r) => r[primaryKey]),
        );

        const recordsToArchive = currentBatchRecords.filter(
          (record) => !existingIds.has(record[primaryKey]),
        );

        const parentArchiveSucceeded =
          recordsToArchive.length === 0 ||
          (await this.archiveRecordsInBatches(
            archiveModel,
            tableName,
            recordsToArchive,
            250,
          ));

        if (!parentArchiveSucceeded) {
          this.logger.error(
            `Archive copy failed for ${tableName}; source deletion skipped for current batch`,
          );
          this.archiveSuccess.set(tableName, false);
          return;
        }

        if (recordsToArchive.length > 0) {
          this.logger.log(
            `✅ Archived ${recordsToArchive.length} new records from ${tableName}. ${currentBatchRecords.length - recordsToArchive.length} already existed.`,
          );
        } else {
          this.logger.log(
            `ℹ️ All ${currentBatchRecords.length} records from current batch already existed in archive.`,
          );
        }

        const parentIdsToDelete = currentBatchRecords.map(
          (r: any) => r[primaryKey],
        );

        totalProcessed += currentBatchRecords.length;

        const childTablesArchived =
          await this.processChildTablesForBatch(parentIdsToDelete);

        if (!childTablesArchived) {
          this.logger.error(
            'Child table archive failed; source deletion skipped for current batch',
          );
          this.archiveSuccess.set(tableName, false);
          return;
        }

        const deletionSucceeded =
          await this.deleteRecordsForBatch(parentIdsToDelete);

        if (!deletionSucceeded) {
          this.archiveSuccess.set(tableName, false);
          return;
        }

        const lastRecord = currentBatchRecords[currentBatchRecords.length - 1];
        lastCursor = {
          createdAt: new Date(lastRecord.createdAt),
          id: lastRecord[primaryKey],
        };

        if (currentBatchRecords.length < batchSize) {
          hasMoreRecords = false;
        }

        this.logger.log(
          `📈 Progress: ${totalProcessed} total records processed for ${tableName}`,
        );
      } catch (error: any) {
        this.logger.error(
          `❌ Error in cursor-based processing for table ${tableName}:`,
        );

        if (error.name === 'SequelizeUniqueConstraintError') {
          this.logger.warn(
            `⚠️ Unique constraint error detected, continuing with next batch...`,
          );

          if (currentBatchRecords.length > 0) {
            const lastRecord =
              currentBatchRecords[currentBatchRecords.length - 1];
            lastCursor = {
              createdAt: new Date(lastRecord.createdAt),
              id: lastRecord[primaryKey],
            };
            totalProcessed += currentBatchRecords.length;

            if (currentBatchRecords.length < batchSize) {
              hasMoreRecords = false;
            }
          } else {
            hasMoreRecords = false;
          }

          continue;
        }

        this.logger.error(error);
        this.archiveSuccess.set(tableName, false);
        return;
      }
    }

    await this.clearArchiveLogs(archiveModel, {
      logType: {
        [Op.notIn]: ['ENTITY', 'LOGIN', 'EVENT'],
      },
    });

    this.logger.log(
      `🎉 Completed processing ${totalProcessed} total records for ${tableName}`,
    );

    this.archivedRecords.set(tableName, { model, count: totalProcessed });
    this.archiveSuccess.set(tableName, true);
    this.logger.log(
      `Successfully processed ${tableName}. Total records: ${totalProcessed}`,
    );
  }

  /**
   * Processa todas as tabelas filhas para um lote específico de IDs da tabela pai
   */
  private async processChildTablesForBatch(
    parentIds: string[],
  ): Promise<boolean> {
    const childTables = [
      'audit_logs_details',
      'audit_logs_entity',
      'audit_logs_error',
      'audit_logs_event',
      'audit_logs_integration',
      'audit_logs_login',
      'audit_logs_request',
    ];
    const noClearTables = [
      'audit_logs_entity',
      'audit_logs_event',
      'audit_logs_login',
    ];

    this.logger.log(
      `🔄 Processing ${childTables.length} child tables for batch of ${parentIds.length} parent IDs`,
    );

    const results = await Promise.all(
      childTables.map(async (tableName) => {
        try {
          this.logger.log(`📊 Processing child table: ${tableName}`);

          const model = this.getModelByTableName(this.models, tableName);
          const archiveModel = this.getModelByTableName(
            this.archiveModels,
            tableName,
          );

          // Buscar registros filhos que referenciam os IDs pai deste lote
          const records: Record<string, any>[] = await (
            model as ModelCtor<Model<any, any>>
          ).findAll({
            where: {
              log_id: {
                [Op.in]: parentIds,
              },
            },
            raw: true,
          });

          if (records.length > 0) {
            this.logger.log(
              `📝 Found ${records.length} records in ${tableName} for current batch`,
            );

            // Verificar duplicidade usando chave primária específica de cada registro
            const existingRecordIds = await this.getExistingRecordsInArchive(
              archiveModel,
              records,
            );

            // Filtrar apenas registros novos baseado na chave primária
            const primaryKey = archiveModel.primaryKeyAttribute;
            const recordsToArchive = records.filter(
              (record) =>
                record[primaryKey] &&
                !existingRecordIds.has(record[primaryKey]),
            );

            const recordsWithoutPrimaryKey = records.filter(
              (record) =>
                record[primaryKey] === null || record[primaryKey] === undefined,
            );

            if (recordsWithoutPrimaryKey.length > 0) {
              this.logger.error(
                `Found ${recordsWithoutPrimaryKey.length} records without primary key in ${tableName}`,
              );
              return false;
            }

            if (recordsToArchive.length > 0) {
              const archiveSucceeded = await this.archiveRecordsInBatches(
                archiveModel,
                tableName,
                recordsToArchive,
                100,
              );

              if (!archiveSucceeded) {
                return false;
              }

              this.logger.log(
                `✅ Archived ${recordsToArchive.length} new records from ${tableName}. ${records.length - recordsToArchive.length} already existed.`,
              );
            } else {
              this.logger.log(
                `ℹ️ All ${records.length} records from ${tableName} already existed in archive.`,
              );
            }
          } else {
            this.logger.log(
              `ℹ️ No records found in ${tableName} for current batch`,
            );
          }

          if (!noClearTables.includes(tableName)) {
            await this.clearArchiveLogs(archiveModel);
          }
          return true;
        } catch (error) {
          this.logger.error(
            `❌ Error processing child table ${tableName}:`,
            error,
          );
          return false;
        }
      }),
    );

    this.logger.log(
      `✅ Completed processing all child tables for current batch`,
    );

    return results.every(Boolean);
  }

  private async deleteRecordsForBatch(parentIds: string[]): Promise<boolean> {
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

    this.logger.log(
      `🗑️ Starting deletion for batch of ${parentIds.length} records`,
    );

    const deleteWithTransaction = async (transaction?: any) => {
      for (const tableName of deletionOrder) {
        const model = this.getModelByTableName(this.models, tableName);
        const isParentTable = tableName === 'audit_logs';

        let deletedCount = 0;

        if (isParentTable) {
          const result = await (model as ModelCtor<Model<any, any>>).destroy({
            where: {
              id: {
                [Op.in]: parentIds,
              },
            },
            transaction,
          });
          deletedCount = result;
        } else {
          const result = await (model as ModelCtor<Model<any, any>>).destroy({
            where: {
              log_id: {
                [Op.in]: parentIds,
              },
            },
            transaction,
          });
          deletedCount = result;
        }

        if (deletedCount > 0) {
          this.logger.log(
            `🗑️ Deleted ${deletedCount} records from ${tableName}`,
          );
        } else {
          this.logger.log(`ℹ️ No records to delete from ${tableName}`);
        }
      }
    };

    try {
      if (typeof (this.sequelize as any).transaction === 'function') {
        await (this.sequelize as any).transaction((transaction: any) =>
          deleteWithTransaction(transaction),
        );
      } else {
        await deleteWithTransaction();
      }
    } catch (error) {
      this.logger.error(
        '❌ Error deleting archived records from source:',
        error,
      );
      return false;
    }

    this.logger.log(`✅ Completed deletion for current batch`);
    return true;
  }

  private async archiveRecordsInBatches(
    archiveModel: typeof Model,
    tableName: string,
    recordsToArchive: Record<string, any>[],
    batchSize: number,
  ): Promise<boolean> {
    for (let i = 0; i < recordsToArchive.length; i += batchSize) {
      const insertBatch = recordsToArchive.slice(i, i + batchSize);

      try {
        await (archiveModel as ModelCtor<Model<any, any>>).bulkCreate(
          insertBatch,
        );
        this.logger.log(
          `💾 Inserted ${insertBatch.length} records into archive for ${tableName}`,
        );
      } catch (insertError) {
        this.logger.error(
          `❌ Error inserting batch into ${tableName}:`,
          insertError,
        );
        return false;
      }
    }

    return true;
  }

  private async clearArchiveLogs(
    model: typeof Model,
    filter = {},
  ): Promise<void> {
    try {
      await this.clearLogs(model, filter);
    } catch (error) {
      this.logger.error(
        `Error clearing archived logs from ${model.tableName}:`,
        error,
      );
    }
  }

  private async getExistingRecordsInArchive(
    archiveModel: typeof Model,
    records: Record<string, any>[],
  ): Promise<Set<string>> {
    if (records.length === 0) return new Set();

    const primaryKey = archiveModel.primaryKeyAttribute;
    const recordIds = records
      .map((r) => r[primaryKey])
      .filter((id) => id !== null && id !== undefined);

    if (recordIds.length === 0) return new Set();

    const existingRecords = await (
      archiveModel as ModelCtor<Model<any, any>>
    ).findAll({
      where: {
        [primaryKey]: {
          [Op.in]: recordIds,
        },
      },
      attributes: [primaryKey],
      raw: true,
    });

    return new Set(existingRecords.map((r: any) => r[primaryKey]));
  }

  private async getExistingIdsInArchiveBatched(
    archiveModel: typeof Model,
    primaryKey: string,
    ids: string[],
  ): Promise<Set<string>> {
    if (ids.length === 0) return new Set();

    const existingIds = new Set<string>();
    const checkBatchSize = 500;

    for (let i = 0; i < ids.length; i += checkBatchSize) {
      const batchIds = ids.slice(i, i + checkBatchSize);

      try {
        const existingRecords = await (
          archiveModel as ModelCtor<Model<any, any>>
        ).findAll({
          where: {
            [primaryKey]: {
              [Op.in]: batchIds,
            },
          },
          attributes: [primaryKey],
          raw: true,
        });

        existingRecords.forEach((r: any) => existingIds.add(r[primaryKey]));
      } catch (error) {
        this.logger.warn(
          `Error checking existing IDs in batch ${i}-${i + checkBatchSize}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    return existingIds;
  }
}
