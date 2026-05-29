import { Op } from 'sequelize';

import { AuditLogArchiveService } from '../audit-log-archive.service';

describe('AuditLogArchiveService', () => {
  let service: AuditLogArchiveService;
  let mockConfig: any;
  let mockSequelize: any;
  let mockArchiveSequelize: any;
  let mockMainModel: any;
  let mockArchiveModel: any;
  let childMainModels: any[];
  let childArchiveModels: any[];

  const createChildModel = (name: string) => ({
    tableName: name,
    primaryKeyAttribute: 'id',
    findAll: jest.fn().mockResolvedValue([]),
    destroy: jest.fn().mockResolvedValue(0),
    bulkCreate: jest.fn().mockResolvedValue([]),
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockConfig = {
      archiveCutoffDays: 30,
      archiveRetentionDays: 90,
      batchSize: 100,
    };

    mockMainModel = {
      tableName: 'audit_logs',
      primaryKeyAttribute: 'id',
      findAll: jest.fn().mockResolvedValue([]),
      destroy: jest.fn().mockResolvedValue(0),
    };

    mockArchiveModel = {
      tableName: 'audit_logs',
      primaryKeyAttribute: 'id',
      findAll: jest.fn().mockResolvedValue([]),
      bulkCreate: jest.fn().mockResolvedValue([]),
      destroy: jest.fn().mockResolvedValue(0),
    };

    const childNames = [
      'audit_logs_details',
      'audit_logs_entity',
      'audit_logs_error',
      'audit_logs_event',
      'audit_logs_integration',
      'audit_logs_login',
      'audit_logs_request',
    ];

    childMainModels = childNames.map(createChildModel);
    childArchiveModels = childNames.map(createChildModel);

    const allMainModels = [mockMainModel, ...childMainModels];
    const allArchiveModels = [mockArchiveModel, ...childArchiveModels];

    mockSequelize = {
      models: Object.fromEntries(allMainModels.map((m, i) => [`Model${i}`, m])),
      transaction: jest.fn((callback: Function) => callback({ id: 'tx-1' })),
    };

    mockArchiveSequelize = {
      models: Object.fromEntries(
        allArchiveModels.map((m, i) => [`Model${i}`, m]),
      ),
    };

    service = new AuditLogArchiveService(
      mockConfig,
      mockSequelize,
      mockArchiveSequelize,
    );
  });

  describe('execute', () => {
    it('should run without errors when no records found', async () => {
      await expect(service.execute()).resolves.not.toThrow();
    });

    it('should archive records found in audit_logs', async () => {
      const records = [
        { id: 'rec-1', createdAt: new Date('2025-01-01'), logType: 'REQUEST' },
        { id: 'rec-2', createdAt: new Date('2025-01-02'), logType: 'ERROR' },
      ];

      // First call returns records, second call returns empty (end of pagination)
      mockMainModel.findAll
        .mockResolvedValueOnce(records)
        .mockResolvedValue([]);

      // No existing IDs in archive
      mockArchiveModel.findAll.mockResolvedValue([]);

      // Child tables return empty
      childMainModels.forEach((m) => m.findAll.mockResolvedValue([]));

      await service.execute();

      expect(mockArchiveModel.bulkCreate).toHaveBeenCalledWith(records);
    });

    it('should skip already existing records in archive', async () => {
      const records = [
        { id: 'rec-1', createdAt: new Date('2025-01-01'), logType: 'REQUEST' },
        { id: 'rec-2', createdAt: new Date('2025-01-02'), logType: 'ERROR' },
      ];

      mockMainModel.findAll
        .mockResolvedValueOnce(records)
        .mockResolvedValue([]);

      // rec-1 already exists in archive
      mockArchiveModel.findAll.mockResolvedValue([{ id: 'rec-1' }]);

      childMainModels.forEach((m) => m.findAll.mockResolvedValue([]));

      await service.execute();

      // Should only archive rec-2
      expect(mockArchiveModel.bulkCreate).toHaveBeenCalledWith([records[1]]);
    });

    it('should process child tables for each batch', async () => {
      const records = [
        { id: 'rec-1', createdAt: new Date('2025-01-01'), logType: 'REQUEST' },
      ];

      mockMainModel.findAll
        .mockResolvedValueOnce(records)
        .mockResolvedValue([]);
      mockArchiveModel.findAll.mockResolvedValue([]);

      // Child entity model has records
      const entityModel = childMainModels.find(
        (m) => m.tableName === 'audit_logs_entity',
      );
      entityModel.findAll.mockResolvedValue([
        { id: 'entity-1', log_id: 'rec-1', entity: 'users' },
      ]);

      // No existing in archive
      const entityArchiveModel = childArchiveModels.find(
        (m) => m.tableName === 'audit_logs_entity',
      );
      entityArchiveModel.findAll.mockResolvedValue([]);

      await service.execute();

      expect(entityArchiveModel.bulkCreate).toHaveBeenCalledWith([
        { id: 'entity-1', log_id: 'rec-1', entity: 'users' },
      ]);
    });

    it('should delete records after archiving', async () => {
      const records = [
        { id: 'rec-1', createdAt: new Date('2025-01-01'), logType: 'REQUEST' },
      ];

      mockMainModel.findAll
        .mockResolvedValueOnce(records)
        .mockResolvedValue([]);
      mockArchiveModel.findAll.mockResolvedValue([]);
      childMainModels.forEach((m) => m.findAll.mockResolvedValue([]));

      await service.execute();

      // Parent table should have destroy called with the IDs
      expect(mockMainModel.destroy).toHaveBeenCalled();
    });

    it('should handle bulkCreate insert errors gracefully and skip source deletion', async () => {
      const records = [
        { id: 'rec-1', createdAt: new Date('2025-01-01'), logType: 'REQUEST' },
      ];

      mockMainModel.findAll
        .mockResolvedValueOnce(records)
        .mockResolvedValue([]);
      mockArchiveModel.findAll.mockResolvedValue([]);
      mockArchiveModel.bulkCreate.mockRejectedValue(new Error('Insert failed'));

      childMainModels.forEach((m) => m.findAll.mockResolvedValue([]));

      // Should not throw
      await expect(service.execute()).resolves.not.toThrow();
      expect(mockMainModel.destroy).not.toHaveBeenCalled();
    });

    it('should skip source deletion when child archive insert fails', async () => {
      const records = [
        { id: 'rec-1', createdAt: new Date('2025-01-01'), logType: 'REQUEST' },
      ];

      mockMainModel.findAll
        .mockResolvedValueOnce(records)
        .mockResolvedValue([]);
      mockArchiveModel.findAll.mockResolvedValue([]);

      const entityModel = childMainModels.find(
        (m) => m.tableName === 'audit_logs_entity',
      );
      entityModel.findAll.mockResolvedValue([
        { id: 'entity-1', log_id: 'rec-1', entity: 'users' },
      ]);

      const entityArchiveModel = childArchiveModels.find(
        (m) => m.tableName === 'audit_logs_entity',
      );
      entityArchiveModel.findAll.mockResolvedValue([]);
      entityArchiveModel.bulkCreate.mockRejectedValue(
        new Error('Insert failed'),
      );

      await expect(service.execute()).resolves.not.toThrow();
      expect(mockMainModel.destroy).not.toHaveBeenCalled();
    });

    it('should use createdAt and primary key cursor for records with equal timestamps', async () => {
      mockConfig.batchSize = 2;

      const sameTimestamp = new Date('2025-01-01T00:00:00.000Z');
      const firstBatch = [
        { id: 'rec-1', createdAt: sameTimestamp, logType: 'REQUEST' },
        { id: 'rec-2', createdAt: sameTimestamp, logType: 'ERROR' },
      ];
      const secondBatch = [
        { id: 'rec-3', createdAt: sameTimestamp, logType: 'EVENT' },
      ];

      mockMainModel.findAll
        .mockResolvedValueOnce(firstBatch)
        .mockResolvedValueOnce(secondBatch)
        .mockResolvedValue([]);
      mockArchiveModel.findAll.mockResolvedValue([]);
      childMainModels.forEach((m) => m.findAll.mockResolvedValue([]));

      await service.execute();

      expect(mockMainModel.findAll).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          order: [
            ['createdAt', 'ASC'],
            ['id', 'ASC'],
          ],
        }),
      );

      const secondCallWhere = mockMainModel.findAll.mock.calls[1][0].where;
      expect(secondCallWhere[Op.and][1][Op.or]).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: {
              [Op.gt]: 'rec-2',
            },
          }),
        ]),
      );
      expect(mockArchiveModel.bulkCreate).toHaveBeenCalledWith(firstBatch);
      expect(mockArchiveModel.bulkCreate).toHaveBeenCalledWith(secondBatch);
    });

    it('should handle SequelizeUniqueConstraintError and continue', async () => {
      const records = [
        { id: 'rec-1', createdAt: new Date('2025-01-01'), logType: 'REQUEST' },
      ];

      const uniqueError = new Error('Unique constraint') as any;
      uniqueError.name = 'SequelizeUniqueConstraintError';

      // First call returns records, then throws unique constraint, then returns empty
      mockMainModel.findAll
        .mockResolvedValueOnce(records)
        .mockRejectedValueOnce(uniqueError)
        .mockResolvedValue([]);

      mockArchiveModel.findAll.mockResolvedValue([]);
      childMainModels.forEach((m) => m.findAll.mockResolvedValue([]));

      await expect(service.execute()).resolves.not.toThrow();
    });

    it('should stop processing on non-unique-constraint errors', async () => {
      const records = [
        { id: 'rec-1', createdAt: new Date('2025-01-01'), logType: 'REQUEST' },
      ];

      mockMainModel.findAll
        .mockResolvedValueOnce(records)
        .mockRejectedValueOnce(new Error('Connection lost'));

      mockArchiveModel.findAll.mockResolvedValue([]);
      childMainModels.forEach((m) => m.findAll.mockResolvedValue([]));

      await expect(service.execute()).resolves.not.toThrow();
    });

    it('should handle child table processing errors gracefully', async () => {
      const records = [
        { id: 'rec-1', createdAt: new Date('2025-01-01'), logType: 'REQUEST' },
      ];

      mockMainModel.findAll
        .mockResolvedValueOnce(records)
        .mockResolvedValue([]);
      mockArchiveModel.findAll.mockResolvedValue([]);

      // One child table throws
      const errorModel = childMainModels.find(
        (m) => m.tableName === 'audit_logs_error',
      );
      errorModel.findAll.mockRejectedValue(new Error('Child error'));

      await expect(service.execute()).resolves.not.toThrow();
    });

    it('should handle deletion errors gracefully', async () => {
      const records = [
        { id: 'rec-1', createdAt: new Date('2025-01-01'), logType: 'REQUEST' },
      ];

      mockMainModel.findAll
        .mockResolvedValueOnce(records)
        .mockResolvedValue([]);
      mockArchiveModel.findAll.mockResolvedValue([]);
      childMainModels.forEach((m) => m.findAll.mockResolvedValue([]));

      // Deletion throws
      mockMainModel.destroy.mockRejectedValue(new Error('Delete failed'));

      await expect(service.execute()).resolves.not.toThrow();
    });

    it('should skip all child records that already exist in archive', async () => {
      const records = [
        { id: 'rec-1', createdAt: new Date('2025-01-01'), logType: 'REQUEST' },
      ];

      mockMainModel.findAll
        .mockResolvedValueOnce(records)
        .mockResolvedValue([]);
      mockArchiveModel.findAll.mockResolvedValue([]);

      const requestModel = childMainModels.find(
        (m) => m.tableName === 'audit_logs_request',
      );
      requestModel.findAll.mockResolvedValue([
        { id: 'req-1', log_id: 'rec-1' },
      ]);

      const requestArchiveModel = childArchiveModels.find(
        (m) => m.tableName === 'audit_logs_request',
      );
      // Return the same ID as already existing
      requestArchiveModel.findAll.mockResolvedValue([{ id: 'req-1' }]);

      await service.execute();

      // Should not call bulkCreate for requests since they already exist
      expect(requestArchiveModel.bulkCreate).not.toHaveBeenCalled();
    });
  });

  describe('clearLogs', () => {
    it('should delete old records based on retention days', async () => {
      await service.clearLogs(mockArchiveModel as any);
      expect(mockArchiveModel.destroy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: expect.any(Object),
          }),
        }),
      );
    });

    it('should support additional filters', async () => {
      await service.clearLogs(mockArchiveModel as any, {
        logType: 'REQUEST',
      });
      expect(mockArchiveModel.destroy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            logType: 'REQUEST',
          }),
        }),
      );
    });
  });
});
