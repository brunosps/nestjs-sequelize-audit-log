/* eslint-disable @typescript-eslint/no-unused-vars */
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { Sequelize } from 'sequelize';
import { AuditLogService } from '../../audit-log-core/services/audit-log.service';
import { InjectConnection } from '@nestjs/sequelize';

export interface AuditLogDatabaseType {
  action: string;
  entity: string;
  changedValues: Record<string, any>;
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
                await this.registerLog('UPDATE', tableName, changes);
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
          await this.registerLog(
            'CREATE',
            instance.constructor.tableName,
            instance.dataValues,
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
            await this.registerLog(
              'UPDATE',
              instance.constructor.tableName,
              changes,
            );
          }
        }
      },
    );

    this.sequelize.addHook(
      'afterDestroy',
      async (instance: any, options: any) => {
        if (this.shouldAuditTable(instance.constructor.tableName)) {
          await this.registerLog(
            'DELETE',
            instance.constructor.tableName,
            instance.dataValues,
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
            await this.registerLog('DELETE', tableName, deletedRecord);
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
  ) {
    try {
      this.auditLogService.registerLog('ENTITY', {
        action,
        entity: tableName,
        changedValues,
      });
    } catch (error) {
      console.error('Error logging entity change:', error);
    }
  }
}
