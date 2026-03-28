import { AuditLogDatabaseService } from '../audit-log-database.service';

describe('AuditLogDatabaseService', () => {
  let service: AuditLogDatabaseService;
  let mockSequelize: any;
  let mockAuditLogService: any;
  let registeredHooks: Record<string, Function>;

  beforeEach(() => {
    registeredHooks = {};
    mockSequelize = {
      addHook: jest.fn((hookName: string, handler: Function) => {
        registeredHooks[hookName] = handler;
      }),
    };
    mockAuditLogService = {
      registerLog: jest.fn(),
    };

    service = new AuditLogDatabaseService(
      mockSequelize,
      ['users', 'orders'],
      mockAuditLogService,
    );
  });

  describe('onModuleInit', () => {
    it('should setup hooks when audited tables are configured', async () => {
      await service.onModuleInit();
      expect(mockSequelize.addHook).toHaveBeenCalledTimes(8);
      expect(registeredHooks).toHaveProperty('afterCreate');
      expect(registeredHooks).toHaveProperty('afterBulkCreate');
      expect(registeredHooks).toHaveProperty('afterUpdate');
      expect(registeredHooks).toHaveProperty('afterDestroy');
      expect(registeredHooks).toHaveProperty('beforeBulkUpdate');
      expect(registeredHooks).toHaveProperty('afterBulkUpdate');
      expect(registeredHooks).toHaveProperty('beforeBulkDestroy');
      expect(registeredHooks).toHaveProperty('afterBulkDestroy');
    });

    it('should not setup hooks when no audited tables', async () => {
      const emptyService = new AuditLogDatabaseService(
        mockSequelize,
        [],
        mockAuditLogService,
      );
      await emptyService.onModuleInit();
      expect(mockSequelize.addHook).not.toHaveBeenCalled();
    });
  });

  describe('afterCreate hook', () => {
    it('should log CREATE for audited tables', async () => {
      await service.onModuleInit();

      const instance = {
        constructor: {
          tableName: 'users',
          rawAttributes: {
            id: { primaryKey: true },
          },
        },
        dataValues: { id: 1, name: 'John' },
      };

      await registeredHooks['afterCreate'](instance, {});
      expect(mockAuditLogService.registerLog).toHaveBeenCalledWith(
        'ENTITY',
        expect.objectContaining({
          action: 'CREATE',
          entity: 'users',
        }),
      );
    });

    it('should not log for non-audited tables', async () => {
      await service.onModuleInit();

      const instance = {
        constructor: { tableName: 'sessions' },
        dataValues: { id: 1 },
      };

      await registeredHooks['afterCreate'](instance, {});
      expect(mockAuditLogService.registerLog).not.toHaveBeenCalled();
    });
  });

  describe('afterBulkCreate hook', () => {
    it('should log CREATE for each instance in bulk create', async () => {
      await service.onModuleInit();

      const instances = [
        {
          constructor: {
            tableName: 'users',
            rawAttributes: { id: { primaryKey: true } },
          },
          dataValues: { id: 1, name: 'John' },
        },
        {
          constructor: {
            tableName: 'users',
            rawAttributes: { id: { primaryKey: true } },
          },
          dataValues: { id: 2, name: 'Jane' },
        },
      ];

      await registeredHooks['afterBulkCreate'](instances, {});
      expect(mockAuditLogService.registerLog).toHaveBeenCalledTimes(2);
      expect(mockAuditLogService.registerLog).toHaveBeenCalledWith(
        'ENTITY',
        expect.objectContaining({
          action: 'CREATE',
          entity: 'users',
          changedValues: { id: 1, name: 'John' },
        }),
      );
      expect(mockAuditLogService.registerLog).toHaveBeenCalledWith(
        'ENTITY',
        expect.objectContaining({
          action: 'CREATE',
          entity: 'users',
          changedValues: { id: 2, name: 'Jane' },
        }),
      );
    });

    it('should not log for non-audited tables in bulk create', async () => {
      await service.onModuleInit();

      const instances = [
        {
          constructor: { tableName: 'sessions' },
          dataValues: { id: 1 },
        },
      ];

      await registeredHooks['afterBulkCreate'](instances, {});
      expect(mockAuditLogService.registerLog).not.toHaveBeenCalled();
    });

    it('should not log for empty instances array', async () => {
      await service.onModuleInit();

      await registeredHooks['afterBulkCreate']([], {});
      expect(mockAuditLogService.registerLog).not.toHaveBeenCalled();
    });
  });

  describe('afterUpdate hook', () => {
    it('should log UPDATE with changed fields', async () => {
      await service.onModuleInit();

      const instance = {
        constructor: {
          tableName: 'users',
          rawAttributes: { id: { primaryKey: true } },
        },
        _previousDataValues: { id: 1, name: 'John', age: 25 },
        dataValues: { id: 1, name: 'Jane', age: 25 },
      };

      await registeredHooks['afterUpdate'](instance, {});
      expect(mockAuditLogService.registerLog).toHaveBeenCalledWith(
        'ENTITY',
        expect.objectContaining({
          action: 'UPDATE',
          changedValues: { name: { from: 'John', to: 'Jane' } },
        }),
      );
    });

    it('should not log when no fields changed', async () => {
      await service.onModuleInit();

      const instance = {
        constructor: {
          tableName: 'users',
          rawAttributes: { id: { primaryKey: true } },
        },
        _previousDataValues: { id: 1, name: 'John' },
        dataValues: { id: 1, name: 'John' },
      };

      await registeredHooks['afterUpdate'](instance, {});
      expect(mockAuditLogService.registerLog).not.toHaveBeenCalled();
    });
  });

  describe('afterDestroy hook', () => {
    it('should log DELETE for audited tables', async () => {
      await service.onModuleInit();

      const instance = {
        constructor: {
          tableName: 'orders',
          rawAttributes: { id: { primaryKey: true } },
        },
        dataValues: { id: 42, total: 100 },
      };

      await registeredHooks['afterDestroy'](instance, {});
      expect(mockAuditLogService.registerLog).toHaveBeenCalledWith(
        'ENTITY',
        expect.objectContaining({
          action: 'DELETE',
          entity: 'orders',
        }),
      );
    });
  });

  describe('beforeBulkUpdate hook', () => {
    it('should capture records before update for audited tables', async () => {
      await service.onModuleInit();

      const records = [{ id: 1, name: 'Old' }];
      const options: any = {
        model: {
          tableName: 'users',
          findAll: jest.fn().mockResolvedValue(records),
        },
        where: { id: 1 },
      };

      await registeredHooks['beforeBulkUpdate'](options);
      expect(options.auditBulkUpdateContext).toEqual({
        recordsBeforeUpdate: records,
        tableName: 'users',
      });
    });
  });

  describe('afterBulkUpdate hook', () => {
    it('should diff and log changes per record', async () => {
      await service.onModuleInit();

      const options: any = {
        model: {
          tableName: 'users',
          rawAttributes: { id: { primaryKey: true } },
          findAll: jest.fn().mockResolvedValue([{ id: 1, name: 'New' }]),
        },
        where: { id: 1 },
        auditBulkUpdateContext: {
          recordsBeforeUpdate: [{ id: 1, name: 'Old' }],
          tableName: 'users',
        },
      };

      await registeredHooks['afterBulkUpdate'](options);
      expect(mockAuditLogService.registerLog).toHaveBeenCalledWith(
        'ENTITY',
        expect.objectContaining({
          action: 'UPDATE',
          changedValues: { name: { from: 'Old', to: 'New' } },
        }),
      );
    });
  });

  describe('bulk destroy hooks', () => {
    it('should capture and log deleted records', async () => {
      await service.onModuleInit();

      const records = [{ id: 1, name: 'Deleted' }];
      const options: any = {
        model: {
          tableName: 'users',
          rawAttributes: { id: { primaryKey: true } },
          findAll: jest.fn().mockResolvedValue(records),
        },
        where: { id: 1 },
      };

      await registeredHooks['beforeBulkDestroy'](options);
      expect(options.auditBulkDeleteContext).toBeDefined();

      await registeredHooks['afterBulkDestroy'](options);
      expect(mockAuditLogService.registerLog).toHaveBeenCalledWith(
        'ENTITY',
        expect.objectContaining({
          action: 'DELETE',
          entity: 'users',
        }),
      );
    });
  });

  describe('value comparison', () => {
    it('should detect Date changes', async () => {
      await service.onModuleInit();

      const instance = {
        constructor: {
          tableName: 'users',
          rawAttributes: { id: { primaryKey: true } },
        },
        _previousDataValues: {
          id: 1,
          updatedAt: new Date('2024-01-01'),
        },
        dataValues: {
          id: 1,
          updatedAt: new Date('2024-06-01'),
        },
      };

      await registeredHooks['afterUpdate'](instance, {});
      expect(mockAuditLogService.registerLog).toHaveBeenCalled();
    });

    it('should handle null to value transitions', async () => {
      await service.onModuleInit();

      const instance = {
        constructor: {
          tableName: 'users',
          rawAttributes: { id: { primaryKey: true } },
        },
        _previousDataValues: { id: 1, email: null },
        dataValues: { id: 1, email: 'test@test.com' },
      };

      await registeredHooks['afterUpdate'](instance, {});
      expect(mockAuditLogService.registerLog).toHaveBeenCalledWith(
        'ENTITY',
        expect.objectContaining({
          changedValues: { email: { from: null, to: 'test@test.com' } },
        }),
      );
    });
  });

  describe('primary key extraction', () => {
    it('should handle composite primary keys', async () => {
      await service.onModuleInit();

      const instance = {
        constructor: {
          tableName: 'users',
          rawAttributes: {
            companyId: { primaryKey: true },
            userId: { primaryKey: true },
          },
        },
        dataValues: { companyId: 'A', userId: '1', name: 'John' },
      };

      await registeredHooks['afterCreate'](instance, {});

      const call = mockAuditLogService.registerLog.mock.calls[0][1];
      expect(call.entityPk).toEqual({ companyId: 'A', userId: '1' });
    });

    it('should default to id when no primary keys defined', async () => {
      await service.onModuleInit();

      const instance = {
        constructor: {
          tableName: 'users',
          rawAttributes: {},
        },
        dataValues: { id: 99, name: 'Test' },
      };

      await registeredHooks['afterCreate'](instance, {});
      const call = mockAuditLogService.registerLog.mock.calls[0][1];
      expect(call.entityPk).toEqual({ id: 99 });
    });
  });
});
