/* eslint-disable @typescript-eslint/no-unused-vars */
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { InjectConnection } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize';

import { AuditLogService } from '../../audit-log-core/services/audit-log.service';

export interface AuditLogDatabaseType {
  action: string;
  entity: string;
  changedValues: Record<string, any>;
  entityPk?: Record<string, any>;
  entityKey?: string;
}

@Injectable()
export class AuditLogDatabaseService implements OnModuleInit {
  constructor(
    @InjectConnection()
    private readonly sequelize: Sequelize,
    @Inject('AUDITEDTABLES')
    private auditedTables: Array<string>,
    @Inject(AuditLogService)
    private readonly auditLogService: AuditLogService,
  ) {}

  async onModuleInit() {
    if (this.auditedTables.length > 0) {
      await this.setupSequelizeHooks();
    }
  }

  private async setupSequelizeHooks() {
    this.sequelize.addHook('beforeBulkUpdate', async (options: any) => {
      if (this.shouldAuditTable(options.model.tableName)) {
        try {
          const recordsBeforeUpdate = await options.model.findAll({
            where: options.where,
            transaction: options.transaction,
            raw: true,
          });

          options.auditBulkUpdateContext = {
            recordsBeforeUpdate,
            tableName: options.model.tableName,
          };
        } catch (error) {
          console.error('Error capturing before bulk update:', error);
        }
      }
    });

    this.sequelize.addHook('afterBulkUpdate', async (options: any) => {
      if (
        this.shouldAuditTable(options.model.tableName) &&
        options.auditBulkUpdateContext
      ) {
        const { recordsBeforeUpdate, tableName } =
          options.auditBulkUpdateContext;

        try {
          const recordsAfterUpdate = await options.model.findAll({
            where: options.where,
            transaction: options.transaction,
            raw: true,
          });

          for (const beforeRecord of recordsBeforeUpdate) {
            const afterRecord = recordsAfterUpdate.find(
              (record: Record<string, any>) =>
                this.isSameRecord(beforeRecord, record, options.model),
            );

            if (afterRecord) {
              const changes = this.getChangedFields(beforeRecord, afterRecord);

              if (Object.keys(changes).length > 0) {
                const mockInstance = {
                  dataValues: afterRecord,
                  constructor: options.model,
                };
                const pkInfo = this.extractPrimaryKeyInfo(mockInstance);
                await this.registerLog(
                  'UPDATE',
                  tableName,
                  changes,
                  pkInfo.entityPk,
                  pkInfo.entityKey,
                );
              }
            }
          }
        } catch (error) {
          console.error('Error processing individual bulk updates:', error);
        }
      }
    });

    this.sequelize.addHook(
      'afterCreate',
      async (instance: any, options: any) => {
        if (this.shouldAuditTable(instance.constructor.tableName)) {
          const pkInfo = this.extractPrimaryKeyInfo(instance);
          await this.registerLog(
            'CREATE',
            instance.constructor.tableName,
            instance.dataValues,
            pkInfo.entityPk,
            pkInfo.entityKey,
          );
        }
      },
    );

    this.sequelize.addHook(
      'afterUpdate',
      async (instance: any, options: any) => {
        if (this.shouldAuditTable(instance.constructor.tableName)) {
          const previousValues = instance._previousDataValues;
          const currentValues = instance.dataValues;
          const changes = this.getChangedFields(previousValues, currentValues);
          if (Object.keys(changes).length > 0) {
            const pkInfo = this.extractPrimaryKeyInfo(instance);
            await this.registerLog(
              'UPDATE',
              instance.constructor.tableName,
              changes,
              pkInfo.entityPk,
              pkInfo.entityKey,
            );
          }
        }
      },
    );

    this.sequelize.addHook(
      'afterDestroy',
      async (instance: any, options: any) => {
        if (this.shouldAuditTable(instance.constructor.tableName)) {
          const pkInfo = this.extractPrimaryKeyInfo(instance);
          await this.registerLog(
            'DELETE',
            instance.constructor.tableName,
            instance.dataValues,
            pkInfo.entityPk,
            pkInfo.entityKey,
          );
        }
      },
    );

    this.sequelize.addHook('beforeBulkDestroy', async (options: any) => {
      if (this.shouldAuditTable(options.model.tableName)) {
        try {
          const recordsBeforeDelete = await options.model.findAll({
            where: options.where,
            transaction: options.transaction,
            raw: true,
          });

          options.auditBulkDeleteContext = {
            recordsBeforeDelete,
            tableName: options.model.tableName,
          };
        } catch (error) {
          console.error('Error capturing before bulk delete:', error);
        }
      }
    });

    this.sequelize.addHook('afterBulkDestroy', async (options: any) => {
      if (
        this.shouldAuditTable(options.model.tableName) &&
        options.auditBulkDeleteContext
      ) {
        const { recordsBeforeDelete, tableName } =
          options.auditBulkDeleteContext;

        try {
          for (const deletedRecord of recordsBeforeDelete) {
            const mockInstance = {
              dataValues: deletedRecord,
              constructor: options.model,
            };
            const pkInfo = this.extractPrimaryKeyInfo(mockInstance);
            await this.registerLog(
              'DELETE',
              tableName,
              deletedRecord,
              pkInfo.entityPk,
              pkInfo.entityKey,
            );
          }
        } catch (error) {
          console.error('Error processing individual bulk deletes:', error);
        }
      }
    });
  }

  private shouldAuditTable(tableName: string): boolean {
    return this.auditedTables.includes(tableName);
  }

  private isSameRecord(record1: any, record2: any, model: any): boolean {
    const primaryKeys = this.getModelPrimaryKeys(model);

    for (const pk of primaryKeys) {
      if (record1[pk] !== record2[pk]) {
        return false;
      }
    }

    return true;
  }

  private getModelPrimaryKeys(model: any): string[] {
    const primaryKeys: string[] = [];

    for (const [key, attribute] of Object.entries(model.rawAttributes || {})) {
      if ((attribute as any).primaryKey) {
        primaryKeys.push(key);
      }
    }

    return primaryKeys.length > 0 ? primaryKeys : ['id'];
  }

  private getChangedFields(
    oldValues: any,
    newValues: any,
  ): Record<string, any> {
    const changes: Record<string, any> = {};

    for (const key in newValues) {
      if (newValues.hasOwnProperty(key)) {
        const oldValue = oldValues[key];
        const newValue = newValues[key];

        if (this.isDifferentValue(oldValue, newValue)) {
          changes[key] = {
            from: oldValue,
            to: newValue,
          };
        }
      }
    }

    return changes;
  }

  private isDifferentValue(oldValue: any, newValue: any): boolean {
    if (oldValue === null || oldValue === undefined) {
      return newValue !== null && newValue !== undefined;
    }

    if (newValue === null || newValue === undefined) {
      return oldValue !== null && oldValue !== undefined;
    }

    if (oldValue instanceof Date && newValue instanceof Date) {
      return oldValue.getTime() !== newValue.getTime();
    }

    if (typeof oldValue === 'number' && typeof newValue === 'number') {
      return Math.abs(oldValue - newValue) > Number.EPSILON;
    }
    return oldValue !== newValue;
  }

  private async registerLog(
    action: 'CREATE' | 'UPDATE' | 'DELETE',
    tableName: string,
    changedValues: Record<string, any>,
    entityPk?: Record<string, any>,
    entityKey?: string,
  ) {
    try {
      this.auditLogService.registerLog('ENTITY', {
        action,
        entity: tableName,
        changedValues,
        entityPk,
        entityKey,
      });
    } catch (error) {
      console.error('Error logging entity change:', error);
    }
  }

  private extractPrimaryKeyInfo(instance: any): {
    entityPk: Record<string, any>;
    entityKey: string;
  } {
    try {
      const model = instance.constructor;
      const primaryKeys = this.getModelPrimaryKeys(model);
      const dataValues = instance.dataValues || instance;

      const entityPk: Record<string, any> = {};
      const pkValues: string[] = [];

      for (const pkField of primaryKeys) {
        const value = dataValues[pkField];
        if (value !== undefined && value !== null) {
          entityPk[pkField] = value;

          const stringValue = this.formatPkValueForConcatenation(
            pkField,
            value,
            model,
          );
          pkValues.push(stringValue);
        }
      }

      const entityKey = pkValues.join('');

      return {
        entityPk,
        entityKey,
      };
    } catch (error) {
      console.error('Error extracting primary key info:', error);
      return {
        entityPk: {},
        entityKey: '',
      };
    }
  }

  private formatPkValueForConcatenation(
    fieldName: string,
    value: any,
    model: any,
  ): string {
    try {
      const fieldAttribute = model.rawAttributes?.[fieldName];

      if (!fieldAttribute) {
        return String(value);
      }

      const dataType = fieldAttribute.type;

      if (dataType.constructor.name === 'STRING' && dataType.options?.length) {
        const maxLength = dataType.options.length;
        return String(value).padEnd(maxLength, ' ');
      }

      if (
        dataType.constructor.name === 'INTEGER' ||
        dataType.constructor.name === 'BIGINT' ||
        dataType.constructor.name === 'DECIMAL'
      ) {
        return String(value);
      }

      return String(value);
    } catch (error) {
      console.error(`Error formatting PK value for field ${fieldName}:`, error);
      return String(value);
    }
  }
}
