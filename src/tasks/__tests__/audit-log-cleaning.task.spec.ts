import { AuditLogCleaningTask } from '../audit-log-cleaning.task';

describe('AuditLogCleaningTask', () => {
  let task: AuditLogCleaningTask;
  let mockSchedulerRegistry: any;
  let mockAuditLogService: any;

  beforeEach(() => {
    mockSchedulerRegistry = {
      addCronJob: jest.fn(),
    };
    mockAuditLogService = {
      clearLogs: jest.fn().mockResolvedValue(undefined),
    };

    task = new AuditLogCleaningTask(
      mockSchedulerRegistry,
      mockAuditLogService,
      '0 0 * * *',
    );
  });

  it('should register cron job on module init', () => {
    task.onModuleInit();
    expect(mockSchedulerRegistry.addCronJob).toHaveBeenCalledWith(
      'AuditLogArchiveTask',
      expect.any(Object),
    );
  });

  it('should call clearLogs when handleArchiving is triggered', async () => {
    await task.handleArchiving();
    expect(mockAuditLogService.clearLogs).toHaveBeenCalled();
  });
});
