import {
  AuditLogBufferService,
  BufferEntry,
} from '../audit-log-buffer.service';

describe('AuditLogBufferService', () => {
  let service: AuditLogBufferService;
  let flushCallback: jest.Mock;
  let config: any;

  let entrySeq = 0;

  const createEntry = (logType = 'ENTITY'): BufferEntry => ({
    logId: `log-${(entrySeq += 1)}`,
    logType,
    data: { action: 'CREATE', entity: 'users', changedValues: { id: 1 } },
    userInfo: { id: 'user-1', ip: '127.0.0.1' },
    timestamp: new Date(),
  });

  beforeEach(() => {
    jest.useFakeTimers();
    flushCallback = jest.fn().mockResolvedValue(undefined);
    config = {
      bufferSize: 3,
      flushIntervalMs: 5000,
      maxBufferSize: 10,
      maxFlushRetries: 3,
    };
    service = new AuditLogBufferService(config);
    service.setFlushCallback(flushCallback);
  });

  afterEach(async () => {
    await service.onModuleDestroy();
    jest.useRealTimers();
  });

  describe('add()', () => {
    it('deve acumular entries no buffer', () => {
      service.add(createEntry());
      service.add(createEntry());
      expect(service.getBufferSize()).toBe(2);
    });

    it('deve fazer flush quando atingir bufferSize', async () => {
      service.add(createEntry());
      service.add(createEntry());
      service.add(createEntry());

      await Promise.resolve();
      expect(flushCallback).toHaveBeenCalledTimes(1);
      expect(flushCallback).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ logType: 'ENTITY' }),
        ]),
      );
      expect(service.getBufferSize()).toBe(0);
    });

    it('deve forçar flush quando atingir maxBufferSize', async () => {
      for (let i = 0; i < 10; i++) {
        service.add(createEntry());
      }

      await Promise.resolve();
      expect(flushCallback).toHaveBeenCalled();
    });
  });

  describe('flush()', () => {
    it('deve chamar flushCallback com as entries acumuladas', async () => {
      service.add(createEntry());
      service.add(createEntry());
      await service.flush();

      expect(flushCallback).toHaveBeenCalledTimes(1);
      expect(flushCallback).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ logType: 'ENTITY' }),
        ]),
      );
      expect(service.getBufferSize()).toBe(0);
    });

    it('não deve chamar flushCallback quando buffer vazio', async () => {
      await service.flush();
      expect(flushCallback).not.toHaveBeenCalled();
    });

    it('deve reencaminhar entries e logar erro quando flushCallback falha', async () => {
      const errorSpy = jest
        .spyOn((service as any).logger, 'error')
        .mockImplementation(() => {});
      flushCallback.mockRejectedValueOnce(new Error('DB error'));

      service.add(createEntry());
      await service.flush();

      expect(errorSpy).toHaveBeenCalledWith(
        'Error flushing audit log buffer:',
        expect.any(Error),
      );
      expect(service.getBufferSize()).toBe(1);
      expect(service.getDroppedEntriesCount()).toBe(0);

      flushCallback.mockResolvedValueOnce(undefined);
      await service.flush();

      expect(service.getBufferSize()).toBe(0);
      errorSpy.mockRestore();
    });

    it('deve descartar entries após exceder maxFlushRetries', async () => {
      const retryService = new AuditLogBufferService({
        bufferSize: 10,
        flushIntervalMs: 60000,
        maxBufferSize: 10,
        maxFlushRetries: 1,
      });
      retryService.setFlushCallback(flushCallback);
      const errorSpy = jest
        .spyOn((retryService as any).logger, 'error')
        .mockImplementation(() => {});
      flushCallback.mockRejectedValue(new Error('DB error'));

      retryService.add(createEntry());
      await retryService.flush();
      expect(retryService.getBufferSize()).toBe(1);

      await retryService.flush();
      expect(retryService.getBufferSize()).toBe(0);
      expect(retryService.getDroppedEntriesCount()).toBe(1);

      await retryService.onModuleDestroy();
      errorSpy.mockRestore();
    });

    it('deve proteger contra reentrada com isFlushing', async () => {
      let resolveFlush: () => void;
      flushCallback.mockReturnValueOnce(
        new Promise<void>((resolve) => {
          resolveFlush = resolve;
        }),
      );

      service.add(createEntry());
      const firstFlush = service.flush();

      service.add(createEntry());
      const secondFlush = service.flush();

      expect(flushCallback).toHaveBeenCalledTimes(1);

      resolveFlush!();
      await Promise.all([firstFlush, secondFlush]);

      expect(flushCallback).toHaveBeenCalledTimes(1);

      await service.flush();
      expect(flushCallback).toHaveBeenCalledTimes(2);
    });
  });

  describe('flush por timer', () => {
    it('deve fazer flush automaticamente quando flushIntervalMs expira', async () => {
      service.add(createEntry());

      jest.advanceTimersByTime(5000);
      await Promise.resolve();

      expect(flushCallback).toHaveBeenCalledTimes(1);
    });
  });

  describe('warning a 80%', () => {
    it('deve logar warning quando buffer atinge 80% de maxBufferSize', async () => {
      const largeService = new AuditLogBufferService({
        bufferSize: 100,
        flushIntervalMs: 60000,
        maxBufferSize: 10,
      });
      largeService.setFlushCallback(flushCallback);
      const warnSpy = jest.spyOn((largeService as any).logger, 'warn');

      for (let i = 0; i < 8; i++) {
        largeService.add(createEntry());
      }

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('capacity'));

      await largeService.onModuleDestroy();
    });
  });

  describe('backpressure', () => {
    it('deve contabilizar entradas descartadas quando buffer está cheio durante flush', async () => {
      let resolveFlush: () => void;
      flushCallback.mockReturnValueOnce(
        new Promise<void>((resolve) => {
          resolveFlush = resolve;
        }),
      );

      const smallService = new AuditLogBufferService({
        bufferSize: 1,
        flushIntervalMs: 60000,
        maxBufferSize: 1,
        maxFlushRetries: 1,
      });
      smallService.setFlushCallback(flushCallback);

      smallService.add(createEntry());
      smallService.add(createEntry());
      smallService.add(createEntry());

      expect(smallService.getDroppedEntriesCount()).toBe(1);

      resolveFlush!();
      await smallService.onModuleDestroy();
    });
  });

  describe('onModuleDestroy()', () => {
    it('deve fazer flush de tudo no shutdown', async () => {
      service.add(createEntry());
      service.add(createEntry());

      await service.onModuleDestroy();

      expect(flushCallback).toHaveBeenCalledTimes(1);
      expect(service.getBufferSize()).toBe(0);
    });
  });
});
