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
    const allIds: any[] = [];

    if (tableName !== 'audit_logs') {
      this.logger.log(
        `⚠️ Skipping ${tableName} - child tables are now processed per batch`,
      );
      return;
    }

    this.logger.log(`🔄 Starting cursor-based processing for ${tableName}`);

    const batchSize = Math.min(this.config.batchSize || 1000, 500);
    let lastCreatedAt: Date | null = null;
    let hasMoreRecords = true;
    let totalProcessed = 0;

    const archiveModel = this.getModelByTableName(
      this.archiveModels,
      tableName,
    );

    while (hasMoreRecords) {
      this.logger.log(
        `📊 Processing batch with cursor after ${lastCreatedAt || 'start'} for ${tableName}`,
      );

      let records: Record<string, any>[] = [];

      try {
        const whereCondition: any = {
          createdAt: {
            [Op.lt]: cutoffDate,
          },
        };

        if (lastCreatedAt) {
          whereCondition.createdAt = {
            [Op.and]: [{ [Op.lt]: cutoffDate }, { [Op.gt]: lastCreatedAt }],
          };
        }

        const records: Record<string, any>[] = await (
          model as ModelCtor<Model<any, any>>
        ).findAll({
          where: whereCondition,
          limit: batchSize,
          order: [['createdAt', 'ASC']],
          raw: true,
        });

        if (records.length === 0) {
          hasMoreRecords = false;
          this.logger.log(
            `✅ No more records found for ${tableName}. Total processed: ${totalProcessed}`,
          );
          break;
        }

        this.logger.log(
          `📝 Found ${records.length} records in current batch for ${tableName}`,
        );

        const existingIds = await this.getExistingIdsInArchiveBatched(
          archiveModel,
          primaryKey,
          records.map((r) => r[primaryKey]),
        );

        const recordsToArchive = records.filter(
          (record) => !existingIds.has(record[primaryKey]),
        );

        if (recordsToArchive.length > 0) {
          const insertBatchSize = Math.min(recordsToArchive.length, 250);
          for (let i = 0; i < recordsToArchive.length; i += insertBatchSize) {
            const insertBatch = recordsToArchive.slice(i, i + insertBatchSize);

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
            }
          }

          this.logger.log(
            `✅ Archived ${recordsToArchive.length} new records from ${tableName}. ${records.length - recordsToArchive.length} already existed.`,
          );
        } else {
          this.logger.log(
            `ℹ️ All ${records.length} records from current batch already existed in archive.`,
          );
        }

        const parentIdsToDelete = records.map((r: any) => r[primaryKey]);
        allIds.push(...parentIdsToDelete);

        totalProcessed += records.length;

        await this.processChildTablesForBatch(parentIdsToDelete);

        await this.deleteRecordsForBatch(parentIdsToDelete);

        lastCreatedAt = new Date(records[records.length - 1].createdAt);

        if (records.length < batchSize) {
          hasMoreRecords = false;
        }

        this.logger.log(
          `📈 Progress: ${totalProcessed} total records processed for ${tableName}`,
        );
      } catch (error: any) {
        this.logger.error(
          `❌ Error in cursor-based processing for table ${tableName}:`,
        );

        // Se for erro de constraint única, tentar continuar com próximo lote
        if (error.name === 'SequelizeUniqueConstraintError') {
          this.logger.warn(
            `⚠️ Unique constraint error detected, continuing with next batch...`,
          );

          // Atualizar cursor mesmo com erro para evitar loop infinito
          if (records && records.length > 0) {
            lastCreatedAt = new Date(records[records.length - 1].createdAt);
            totalProcessed += records.length;

            // Se retornamos menos registros que o batchSize, chegamos ao fim
            if (records.length < batchSize) {
              hasMoreRecords = false;
            }
          } else {
            hasMoreRecords = false;
          }

          continue; // Continua para próxima iteração
        }

        // Para outros tipos de erro, interromper o processamento
        this.logger.error(error);
        this.archiveSuccess.set(tableName, false);
        return;
      }
    }

    this.clearLogs(archiveModel, {
      logType: {
        [Op.notIn]: ['ENTITY', 'LOGIN', 'EVENT'],
      },
    });

    this.logger.log(
      `🎉 Completed processing ${totalProcessed} total records for ${tableName}`,
    );

    this.archivedRecords.set(tableName, { model, ids: allIds });
    this.archiveSuccess.set(tableName, true);
    this.logger.log(
      `Successfully processed ${tableName}. Total IDs for deletion: ${allIds.length}`,
    );
  }

  /**
   * Processa todas as tabelas filhas para um lote específico de IDs da tabela pai
   */
  private async processChildTablesForBatch(parentIds: string[]): Promise<void> {
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

    for (const tableName of childTables) {
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
              record[primaryKey] && !existingRecordIds.has(record[primaryKey]),
          );

          if (recordsToArchive.length > 0) {
            // Processar em sub-lotes para evitar timeouts
            const insertBatchSize = Math.min(recordsToArchive.length, 100);
            for (let i = 0; i < recordsToArchive.length; i += insertBatchSize) {
              const insertBatch = recordsToArchive.slice(
                i,
                i + insertBatchSize,
              );

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
                // Continuar com próximo lote mesmo se um falhar
              }
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
          this.clearLogs(archiveModel);
        }
      } catch (error) {
        this.logger.error(
          `❌ Error processing child table ${tableName}:`,
          error,
        );
      }
    }

    this.logger.log(
      `✅ Completed processing all child tables for current batch`,
    );
  }

  private async deleteRecordsForBatch(parentIds: string[]): Promise<void> {
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

    for (const tableName of deletionOrder) {
      try {
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
          });
          deletedCount = result;
        } else {
          const result = await (model as ModelCtor<Model<any, any>>).destroy({
            where: {
              log_id: {
                [Op.in]: parentIds,
              },
            },
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
      } catch (error) {
        this.logger.error(
          `❌ Error deleting records from ${tableName}:`,
          error,
        );
      }
    }

    this.logger.log(`✅ Completed deletion for current batch`);
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
