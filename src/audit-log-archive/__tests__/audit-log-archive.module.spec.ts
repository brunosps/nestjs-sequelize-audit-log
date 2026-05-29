import { AuditLogArchiveModule } from '../audit-log-archive.module';

// Mock Sequelize constructor at the module level but preserve Model for inheritance
jest.mock('sequelize-typescript', () => {
  const actual = jest.requireActual('sequelize-typescript');
  const mockInstance = {
    authenticate: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined),
    addModels: jest.fn(),
    sync: jest.fn().mockResolvedValue(undefined),
  };
  return {
    ...actual,
    Sequelize: jest.fn().mockImplementation(() => mockInstance),
    __mockInstance: mockInstance,
  };
});

describe('AuditLogArchiveModule', () => {
  const { Sequelize, __mockInstance } = require('sequelize-typescript');

  beforeEach(() => {
    jest.clearAllMocks();
    __mockInstance.authenticate.mockResolvedValue(undefined);
    __mockInstance.close.mockResolvedValue(undefined);
    __mockInstance.addModels.mockReturnValue(undefined);
    __mockInstance.sync.mockResolvedValue(undefined);
  });

  describe('testSequelizeConnection', () => {
    it('should return true when connection succeeds', async () => {
      const result = await AuditLogArchiveModule.testSequelizeConnection({
        archiveRetentionDays: 90,
        archiveDatabase: {
          dialect: 'mssql',
          host: 'localhost',
          port: 1433,
          database: 'archive_db',
          username: 'sa',
          password: 'StrongPassword!123',
          dialectOptions: {},
        } as any,
        archiveCronSchedule: '0 2 * * *',
      });

      expect(result).toBe(true);
      expect(Sequelize).toHaveBeenCalledWith(
        expect.objectContaining({
          dialect: 'mssql',
          host: 'localhost',
          port: 1433,
          database: 'archive_db',
          username: 'sa',
          password: 'StrongPassword!123',
        }),
      );
      expect(__mockInstance.authenticate).toHaveBeenCalled();
      expect(__mockInstance.close).toHaveBeenCalled();
    });

    it('should return false when connection fails', async () => {
      __mockInstance.authenticate.mockRejectedValue(new Error('Connection refused'));

      const result = await AuditLogArchiveModule.testSequelizeConnection({
        archiveRetentionDays: 90,
        archiveDatabase: {
          dialect: 'mssql',
          host: 'unreachable',
          port: 1433,
          database: 'archive_db',
          dialectOptions: {},
        } as any,
        archiveCronSchedule: '0 2 * * *',
      });

      expect(result).toBe(false);
      expect(__mockInstance.close).toHaveBeenCalled();
    });

    it('should always close the connection in finally block', async () => {
      __mockInstance.authenticate.mockRejectedValue(new Error('timeout'));

      await AuditLogArchiveModule.testSequelizeConnection({
        archiveRetentionDays: 90,
        archiveDatabase: {
          dialect: 'mssql',
          host: 'localhost',
          port: 1433,
          database: 'db',
        } as any,
        archiveCronSchedule: '0 0 * * *',
      });

      expect(__mockInstance.close).toHaveBeenCalled();
    });
  });

  describe('register', () => {
    it('should return a DynamicModule with all providers', () => {
      const config = {
        archiveRetentionDays: 90,
        archiveDatabase: {
          dialect: 'mssql',
          host: 'localhost',
          port: 1433,
          database: 'archive_db',
        } as any,
        archiveCronSchedule: '0 2 * * *',
        batchSize: 500,
      };

      const result = AuditLogArchiveModule.register(config);

      expect(result.module).toBe(AuditLogArchiveModule);
      expect(result.providers).toBeDefined();

      const providers = result.providers as any[];
      const cronProvider = providers.find((p) => p.provide === 'ARCHIVE_CRON_SCHEDULE');
      expect(cronProvider.useValue).toBe('0 2 * * *');

      const configProvider = providers.find((p) => p.provide === 'AUDIT_LOG_CONFIG');
      expect(configProvider.useValue).toBe(config);

      const archiveSeqProvider = providers.find((p) => p.provide === 'ARCHIVE_SEQUELIZE');
      expect(archiveSeqProvider.useFactory).toBeDefined();

      const mainSeqProvider = providers.find((p) => p.provide === 'MAIN_SEQUELIZE');
      expect(mainSeqProvider).toBeDefined();
    });

    it('ARCHIVE_SEQUELIZE factory should create and configure sequelize', async () => {
      const config = {
        archiveRetentionDays: 90,
        archiveDatabase: {
          dialect: 'mssql',
          host: 'localhost',
          port: 1433,
          database: 'archive_db',
          dialectOptions: {},
        } as any,
        archiveCronSchedule: '0 2 * * *',
      };

      const result = AuditLogArchiveModule.register(config);
      const providers = result.providers as any[];
      const archiveSeqProvider = providers.find((p) => p.provide === 'ARCHIVE_SEQUELIZE');

      const sequelize = await archiveSeqProvider.useFactory();

      expect(__mockInstance.addModels).toHaveBeenCalled();
      expect(__mockInstance.sync).toHaveBeenCalled();
    });

    it('ARCHIVE_SEQUELIZE factory should preserve dialectOptions options', async () => {
      const config = {
        archiveRetentionDays: 90,
        archiveDatabase: {
          dialect: 'mssql',
          host: 'localhost',
          port: 1433,
          database: 'archive_db',
          username: 'sa',
          password: 'StrongPassword!123',
          dialectOptions: {
            connectTimeout: 15000,
            options: {
              encrypt: false,
              trustServerCertificate: true,
              requestTimeout: 45000,
            },
          },
        } as any,
        archiveCronSchedule: '0 2 * * *',
      };

      const result = AuditLogArchiveModule.register(config);
      const providers = result.providers as any[];
      const archiveSeqProvider = providers.find((p) => p.provide === 'ARCHIVE_SEQUELIZE');

      await archiveSeqProvider.useFactory();

      expect(Sequelize).toHaveBeenLastCalledWith(
        expect.objectContaining({
          dialectOptions: expect.objectContaining({
            connectTimeout: 15000,
            options: expect.objectContaining({
              encrypt: false,
              trustServerCertificate: true,
              requestTimeout: 45000,
            }),
          }),
        }),
      );
    });
  });
});
