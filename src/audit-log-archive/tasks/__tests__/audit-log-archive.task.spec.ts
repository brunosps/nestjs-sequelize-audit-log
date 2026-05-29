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

  describe('mutex', () => {
    it('deve pular execução quando já está rodando', async () => {
      const warnSpy = jest.spyOn((task as any).logger, 'warn');

      let resolveExecute: () => void;
      mockArchiveService.execute.mockReturnValue(
        new Promise<void>((resolve) => {
          resolveExecute = resolve;
        }),
      );

      const firstRun = task.handleArchiving();
      await task.handleArchiving();

      expect(warnSpy).toHaveBeenCalledWith(
        'Archive task already running — skipping this execution',
      );
      expect(mockArchiveService.execute).toHaveBeenCalledTimes(1);

      resolveExecute!();
      await firstRun;
    });

    it('deve liberar mutex após sucesso', async () => {
      await task.handleArchiving();
      expect((task as any).isRunning).toBe(false);
    });

    it('deve liberar mutex após erro', async () => {
      mockArchiveService.execute.mockRejectedValueOnce(new Error('DB error'));
      await task.handleArchiving();
      expect((task as any).isRunning).toBe(false);
    });
  });

  describe('timeout', () => {
    it('deve rejeitar com timeout e manter mutex até work terminar', async () => {
      jest.useFakeTimers();
      const errorSpy = jest.spyOn((task as any).logger, 'error');

      let resolveWork: () => void;
      mockArchiveService.execute.mockReturnValue(
        new Promise<void>((resolve) => {
          resolveWork = resolve;
        }),
      );

      const handling = task.handleArchiving();

      await jest.advanceTimersByTimeAsync(30 * 60 * 1000 + 1000);

      expect(errorSpy).toHaveBeenCalledWith(
        'Archive task error:',
        expect.objectContaining({ message: 'Archive timeout exceeded' }),
      );

      // Mutex stays locked since work hasn't finished
      expect((task as any).isRunning).toBe(true);

      // Resolve the actual work
      resolveWork!();
      await handling;

      // Mutex released after work completes
      expect((task as any).isRunning).toBe(false);

      jest.useRealTimers();
    });
  });
});
