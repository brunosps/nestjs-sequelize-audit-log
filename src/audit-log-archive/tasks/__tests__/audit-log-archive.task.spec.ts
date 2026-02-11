import { AuditLogArchiveTask } from '../audit-log-archive.task';

describe('AuditLogArchiveTask', () => {
  let task: AuditLogArchiveTask;
  let mockSchedulerRegistry: any;
  let mockArchiveService: any;

  beforeEach(() => {
    mockSchedulerRegistry = {
      addCronJob: jest.fn(),
    };
    mockArchiveService = {
      execute: jest.fn().mockResolvedValue(undefined),
    };

    task = new AuditLogArchiveTask(
      mockSchedulerRegistry,
      mockArchiveService,
      '0 2 * * *',
    );
  });

  it('should register cron job on module init', () => {
    task.onModuleInit();
    expect(mockSchedulerRegistry.addCronJob).toHaveBeenCalledWith(
      'AuditLogArchiveTask',
      expect.any(Object),
    );
  });

  it('should call archiveService.execute when handleArchiving is triggered', async () => {
    await task.handleArchiving();
    expect(mockArchiveService.execute).toHaveBeenCalled();
  });
});
