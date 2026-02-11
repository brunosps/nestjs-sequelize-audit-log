import { AuditLogModule } from '../audit-log.module';
import { AuditLogArchiveModule } from '../audit-log-archive/audit-log-archive.module';
import { AuditLogModuleOptions } from '../interfaces/audit-log-module-options.interface';

jest.mock('../audit-log-archive/audit-log-archive.module', () => {
  const actual = jest.requireActual('../audit-log-archive/audit-log-archive.module');
  return {
    ...actual,
    AuditLogArchiveModule: {
      ...actual.AuditLogArchiveModule,
      testSequelizeConnection: jest.fn().mockResolvedValue(false),
      register: jest.fn().mockReturnValue({ module: class MockArchive {}, providers: [], exports: [] }),
    },
  };
});

const defaultOpts: AuditLogModuleOptions = {
  logRetentionDays: 5,
  cleaningCronSchedule: '0 0 * * *',
};

describe('AuditLogModule', () => {
  it('should return a DynamicModule with defaults', async () => {
    const result = await AuditLogModule.register();

    expect(result.module).toBe(AuditLogModule);
    expect(result.imports).toBeDefined();
    expect(result.imports.length).toBeGreaterThan(0);
    expect(result.exports).toBeDefined();
  });

  it('should include cleaning task when archive is not configured', async () => {
    const result = await AuditLogModule.register({
      ...defaultOpts,
      logRetentionDays: 10,
    });

    const providers = result.providers as any[];
    const cronProvider = providers.find((p) => p.provide === 'CLEANING_CRON_SCHEDULE');
    expect(cronProvider).toBeDefined();
    expect(cronProvider.useValue).toBe('0 0 * * *');
  });

  it('should include database module when auditedTables are provided', async () => {
    const result = await AuditLogModule.register({
      ...defaultOpts,
      auditedTables: ['users', 'orders'],
    });

    // imports should include database module  
    expect(result.imports.length).toBeGreaterThan(2); // core + event + database
  });

  it('should include error module when enableErrorLogging is true', async () => {
    const result = await AuditLogModule.register({
      ...defaultOpts,
      enableErrorLogging: true,
    });

    expect(result.imports.length).toBeGreaterThan(2);
  });

  it('should include request module when enableRequestLogging is set', async () => {
    const result = await AuditLogModule.register({
      ...defaultOpts,
      enableRequestLogging: [
        { path: '/auth/login', methods: ['POST'], system: 'auth' },
      ],
    });

    expect(result.exports).toEqual(
      expect.arrayContaining([expect.any(Function)]),
    );
  });

  it('should include request module with empty array when enableRequestLogging is true', async () => {
    const result = await AuditLogModule.register({
      ...defaultOpts,
      enableRequestLogging: true,
    });

    expect(result.imports.length).toBeGreaterThan(2);
  });

  it('should always include integration module', async () => {
    const result = await AuditLogModule.register({ ...defaultOpts });

    expect(result.imports.length).toBeGreaterThanOrEqual(2);
  });

  it('should try archive connection but fall back to cleaning when it fails', async () => {
    (AuditLogArchiveModule.testSequelizeConnection as jest.Mock).mockResolvedValue(false);

    const result = await AuditLogModule.register({
      ...defaultOpts,
      enableArchive: {
        archiveRetentionDays: 90,
        archiveDatabase: { dialect: 'mssql', host: 'localhost' } as any,
        archiveCronSchedule: '0 2 * * *',
      },
    });

    const providers = result.providers as any[];
    const cronProvider = providers.find((p) => p.provide === 'CLEANING_CRON_SCHEDULE');
    expect(cronProvider).toBeDefined();
  });

  it('should use archive module when connection succeeds', async () => {
    (AuditLogArchiveModule.testSequelizeConnection as jest.Mock).mockResolvedValue(true);

    const result = await AuditLogModule.register({
      ...defaultOpts,
      enableArchive: {
        archiveRetentionDays: 90,
        archiveDatabase: { dialect: 'mssql', host: 'localhost' } as any,
        archiveCronSchedule: '0 2 * * *',
      },
    });

    // Should not have cleaning task
    const providers = result.providers as any[];
    const cronProvider = providers?.find?.((p: any) => p.provide === 'CLEANING_CRON_SCHEDULE');
    expect(cronProvider).toBeUndefined();
  });

  it('should pass getUserId and getIpAddress to core module', async () => {
    const getUserId = jest.fn();
    const getIpAddress = jest.fn();

    const result = await AuditLogModule.register({
      ...defaultOpts,
      getUserId,
      getIpAddress,
    });

    expect(result.module).toBe(AuditLogModule);
  });

  it('should include enableIntegrationLogging option', async () => {
    const result = await AuditLogModule.register({
      ...defaultOpts,
      enableIntegrationLogging: true,
    });

    expect(result.module).toBe(AuditLogModule);
  });
});
