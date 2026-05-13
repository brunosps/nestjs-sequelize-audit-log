import { AuditLogBufferService, BufferEntry } from '../audit-log-buffer.service';

describe('AuditLogBufferService', () => {
  let service: AuditLogBufferService;
  let flushCallback: jest.Mock;
  let config: any;

  const createEntry = (logType = 'ENTITY'): BufferEntry => ({
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
    };
    service = new AuditLogBufferService(config, flushCallback);
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

    it('deve perder entries e logar erro quando flushCallback falha', async () => {
      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      flushCallback.mockRejectedValueOnce(new Error('DB error'));

      service.add(createEntry());
      await service.flush();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error flushing audit log buffer:',
        expect.any(Error),
      );
      expect(service.getBufferSize()).toBe(0);
      consoleSpy.mockRestore();
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
      await service.flush();

      expect(flushCallback).toHaveBeenCalledTimes(1);

      resolveFlush!();
      await firstFlush;
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
    it('deve logar warning quando buffer atinge 80% de maxBufferSize', () => {
      const largeService = new AuditLogBufferService(
        { bufferSize: 100, flushIntervalMs: 60000, maxBufferSize: 10 },
        flushCallback,
      );
      const warnSpy = jest.spyOn((largeService as any).logger, 'warn');

      for (let i = 0; i < 8; i++) {
        largeService.add(createEntry());
      }

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('capacity'),
      );

      largeService.onModuleDestroy();
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
