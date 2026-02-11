import 'reflect-metadata';

import { AuditLogEvent, AuditLogEventOptions } from '../audit-log-event.decorator';

describe('AuditLogEvent Decorator', () => {
  beforeEach(() => {
    delete (global as any)['AUDIT_LOG_SERVICE'];
  });

  const createDecoratedClass = (options: AuditLogEventOptions) => {
    class TestService {
      @AuditLogEvent(options)
      async myMethod(...args: any[]) {
        return { result: 'ok', args };
      }
    }
    return new TestService();
  };

  const baseOptions: AuditLogEventOptions = {
    eventType: 'TEST_EVENT',
    eventDescription: 'A test event',
    getUserId: (args, result) => 'user-1',
  };

  it('should call the original method and return result', async () => {
    const service = createDecoratedClass(baseOptions);
    const result = await service.myMethod('arg1');
    expect(result).toEqual({ result: 'ok', args: ['arg1'] });
  });

  it('should log event with SUCCESS status on success', async () => {
    const logEvent = jest.fn();
    (global as any)['AUDIT_LOG_SERVICE'] = { logEvent };

    const service = createDecoratedClass(baseOptions);
    await service.myMethod('arg1');

    expect(logEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'TEST_EVENT',
        description: 'A test event',
        userId: 'user-1',
        eventStatus: 'SUCCESS',
      }),
    );
  });

  it('should use getDetails for success details', async () => {
    const logEvent = jest.fn();
    (global as any)['AUDIT_LOG_SERVICE'] = { logEvent };

    const service = createDecoratedClass({
      ...baseOptions,
      getDetails: (args, result) => ({ customDetail: result.result }),
    });
    await service.myMethod();

    expect(logEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        details: { details: { customDetail: 'ok' } },
        eventStatus: 'SUCCESS',
      }),
    );
  });

  it('should set default ipAddress as 0.0.0.0', async () => {
    const logEvent = jest.fn();
    (global as any)['AUDIT_LOG_SERVICE'] = { logEvent };

    const service = createDecoratedClass(baseOptions);
    await service.myMethod();

    expect(logEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        ipAddress: '0.0.0.0',
      }),
    );
  });

  it('should use getIpAddress when provided', async () => {
    const logEvent = jest.fn();
    (global as any)['AUDIT_LOG_SERVICE'] = { logEvent };

    const service = createDecoratedClass({
      ...baseOptions,
      getIpAddress: () => '10.0.0.1',
    });
    await service.myMethod();

    expect(logEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        ipAddress: '10.0.0.1',
      }),
    );
  });

  it('should log event with ERROR status and re-throw on error', async () => {
    const logEvent = jest.fn();
    (global as any)['AUDIT_LOG_SERVICE'] = { logEvent };

    class FailService {
      @AuditLogEvent(baseOptions)
      async myMethod() {
        throw new Error('something broke');
      }
    }

    const service = new FailService();
    await expect(service.myMethod()).rejects.toThrow('something broke');

    expect(logEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventStatus: 'ERROR',
      }),
    );
  });

  it('should use onError callback for error details', async () => {
    const logEvent = jest.fn();
    (global as any)['AUDIT_LOG_SERVICE'] = { logEvent };

    class FailService {
      @AuditLogEvent({
        ...baseOptions,
        onError: (args, error) => ({
          failedWith: error.message,
          input: args[0],
        }),
      })
      async myMethod(input: string) {
        throw new Error('boom');
      }
    }

    const service = new FailService();
    await expect(service.myMethod('test-input')).rejects.toThrow('boom');

    expect(logEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        details: {
          details: {
            failedWith: 'boom',
            input: 'test-input',
          },
        },
        eventStatus: 'ERROR',
      }),
    );
  });

  it('should use default error details when onError is not provided', async () => {
    const logEvent = jest.fn();
    (global as any)['AUDIT_LOG_SERVICE'] = { logEvent };

    class FailService {
      @AuditLogEvent(baseOptions)
      async myMethod() {
        throw new Error('default error');
      }
    }

    const service = new FailService();
    await expect(service.myMethod()).rejects.toThrow('default error');

    const callArg = logEvent.mock.calls[0][0];
    expect(callArg.details.details.error).toEqual({
      message: 'default error',
      name: 'Error',
    });
  });

  it('should handle non-Error thrown values in catch', async () => {
    const logEvent = jest.fn();
    (global as any)['AUDIT_LOG_SERVICE'] = { logEvent };

    class FailService {
      @AuditLogEvent(baseOptions)
      async myMethod() {
        throw 'string-error';
      }
    }

    const service = new FailService();
    // Non-Error thrown values are not instances of Error, so they won't be re-thrown
    // by the `if (result instanceof Error)` check
    const result = await service.myMethod();
    expect(result).toBe('string-error');

    const callArg = logEvent.mock.calls[0][0];
    expect(callArg.details.details.error).toBe('string-error');
  });

  it('should not log when AUDIT_LOG_SERVICE is not set', async () => {
    // No global service set
    const service = createDecoratedClass(baseOptions);
    // Should not throw
    const result = await service.myMethod();
    expect(result).toEqual({ result: 'ok', args: [] });
  });

  it('should handle logEvent throwing error gracefully', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation();
    (global as any)['AUDIT_LOG_SERVICE'] = {
      logEvent: () => { throw new Error('log failed'); },
    };

    const service = createDecoratedClass(baseOptions);
    // Should not throw
    const result = await service.myMethod();
    expect(result).toEqual({ result: 'ok', args: [] });
    expect(consoleError).toHaveBeenCalledWith(
      'Failed to log audit event:',
      expect.any(Error),
    );
    consoleError.mockRestore();
  });
});
