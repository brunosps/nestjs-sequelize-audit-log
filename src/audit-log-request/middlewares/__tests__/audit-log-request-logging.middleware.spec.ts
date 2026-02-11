import { AuditLogRequestLoggingMiddleware } from '../audit-log-request-logging.middleware';

describe('AuditLogRequestLoggingMiddleware', () => {
  let middleware: AuditLogRequestLoggingMiddleware;
  let mockAuditLogService: any;

  beforeEach(() => {
    mockAuditLogService = {
      registerLog: jest.fn(),
    };
  });

  const createMockRes = () => {
    const listeners: Record<string, Function[]> = {};
    return {
      statusCode: 200,
      get: jest.fn().mockReturnValue('100'),
      write: jest.fn().mockReturnValue(true),
      end: jest.fn(),
      on: jest.fn((event: string, handler: Function) => {
        listeners[event] = listeners[event] || [];
        listeners[event].push(handler);
      }),
      _listeners: listeners,
      emit(event: string) {
        (listeners[event] || []).forEach((fn) => fn());
      },
    };
  };

  it('should log REQUEST on finish', async () => {
    middleware = new AuditLogRequestLoggingMiddleware([], mockAuditLogService);

    const req: any = {
      method: 'GET',
      originalUrl: '/api/data',
      body: { key: 'value' },
    };
    const res = createMockRes();
    const next = jest.fn();

    await middleware.use(req, res as any, next);
    expect(next).toHaveBeenCalled();

    // Simulate response finish
    res.emit('finish');

    expect(mockAuditLogService.registerLog).toHaveBeenCalledWith(
      'REQUEST',
      expect.objectContaining({
        requestMethod: 'GET',
        requestURL: '/api/data',
        responseStatus: 200,
      }),
    );
  });

  it('should log LOGIN for matching auth routes', async () => {
    const authRoutes = [
      {
        path: '/auth/login',
        methods: ['POST'],
        getUserId: (body: any) => body.email,
        registerRequest: true,
        system: 'auth',
      },
    ];
    middleware = new AuditLogRequestLoggingMiddleware(
      authRoutes,
      mockAuditLogService,
    );

    const req: any = {
      method: 'POST',
      originalUrl: '/auth/login',
      body: { email: 'user@test.com', password: 'secret' },
    };
    const res = createMockRes();
    const next = jest.fn();

    await middleware.use(req, res as any, next);

    // After middleware.use(), res.write/res.end are replaced by the middleware
    // to capture response body. Call the replaced end with a JSON chunk to
    // simulate the server sending a response body.
    const responseBody = JSON.stringify({ email: 'user@test.com' });
    res.end(Buffer.from(responseBody));

    // Trigger finish to fire the logging callback
    res.emit('finish');

    expect(mockAuditLogService.registerLog).toHaveBeenCalledWith(
      'LOGIN',
      expect.objectContaining({
        system: 'auth',
        registerRequest: true,
      }),
    );
  });

  it('should log REQUEST when auth route does not match', async () => {
    const authRoutes = [
      {
        path: '/auth/login',
        methods: ['POST'],
        system: 'auth',
      },
    ];
    middleware = new AuditLogRequestLoggingMiddleware(
      authRoutes,
      mockAuditLogService,
    );

    const req: any = {
      method: 'GET',
      originalUrl: '/api/data',
      body: {},
    };
    const res = createMockRes();
    const next = jest.fn();

    await middleware.use(req, res as any, next);
    res.emit('finish');

    expect(mockAuditLogService.registerLog).toHaveBeenCalledWith(
      'REQUEST',
      expect.any(Object),
    );
  });

  it('should handle empty body', async () => {
    middleware = new AuditLogRequestLoggingMiddleware([], mockAuditLogService);

    const req: any = {
      method: 'GET',
      originalUrl: '/api/data',
      body: {},
    };
    const res = createMockRes();
    const next = jest.fn();

    await middleware.use(req, res as any, next);
    res.emit('finish');

    const call = mockAuditLogService.registerLog.mock.calls[0][1];
    expect(call.payload).toBe('');
  });

  it('should handle null/undefined authRoutes', async () => {
    middleware = new AuditLogRequestLoggingMiddleware(
      null as any,
      mockAuditLogService,
    );

    const req: any = {
      method: 'GET',
      originalUrl: '/api/data',
      body: {},
    };
    const res = createMockRes();
    const next = jest.fn();

    await middleware.use(req, res as any, next);
    res.emit('finish');

    expect(mockAuditLogService.registerLog).toHaveBeenCalledWith(
      'REQUEST',
      expect.any(Object),
    );
  });

  it('should capture response body from write and end chunks', async () => {
    middleware = new AuditLogRequestLoggingMiddleware([], mockAuditLogService);

    const req: any = {
      method: 'POST',
      originalUrl: '/api/data',
      body: { a: 1 },
    };
    const res = createMockRes();
    const next = jest.fn();

    await middleware.use(req, res as any, next);

    // After middleware.use, res.write and res.end are replaced.
    // Call the patched write with a string chunk
    res.write('{"partial":');
    // Call the patched end with the final chunk
    res.end('"data"}');

    res.emit('finish');

    const call = mockAuditLogService.registerLog.mock.calls[0][1];
    expect(call.responseBody).toContain('partial');
  });

  it('should capture Buffer chunks in write', async () => {
    middleware = new AuditLogRequestLoggingMiddleware([], mockAuditLogService);

    const req: any = {
      method: 'POST',
      originalUrl: '/api/test',
      body: { x: 1 },
    };
    const res = createMockRes();
    const next = jest.fn();

    await middleware.use(req, res as any, next);

    // Write a Buffer chunk
    res.write(Buffer.from('buffer-data'));
    res.end();

    res.emit('finish');

    const call = mockAuditLogService.registerLog.mock.calls[0][1];
    expect(call.responseBody).toContain('buffer-data');
  });

  it('should handle write with encoding parameter', async () => {
    middleware = new AuditLogRequestLoggingMiddleware([], mockAuditLogService);

    const req: any = {
      method: 'POST',
      originalUrl: '/api/test',
      body: {},
    };
    const res = createMockRes();
    const next = jest.fn();

    await middleware.use(req, res as any, next);

    // Write with explicit encoding
    res.write('encoded-data', 'utf8');
    res.end(null);

    res.emit('finish');

    const call = mockAuditLogService.registerLog.mock.calls[0][1];
    expect(call.responseBody).toContain('encoded-data');
  });

  it('should handle end with Buffer chunk', async () => {
    middleware = new AuditLogRequestLoggingMiddleware([], mockAuditLogService);

    const req: any = {
      method: 'GET',
      originalUrl: '/api/buf',
      body: {},
    };
    const res = createMockRes();
    const next = jest.fn();

    await middleware.use(req, res as any, next);

    res.end(Buffer.from('end-buffer'));

    res.emit('finish');

    const call = mockAuditLogService.registerLog.mock.calls[0][1];
    expect(call.responseBody).toContain('end-buffer');
  });

  it('should handle errors in finish callback gracefully', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation();
    mockAuditLogService.registerLog.mockImplementation(() => {
      throw new Error('log failed');
    });

    middleware = new AuditLogRequestLoggingMiddleware([], mockAuditLogService);

    const req: any = {
      method: 'GET',
      originalUrl: '/api/data',
      body: {},
    };
    const res = createMockRes();
    const next = jest.fn();

    await middleware.use(req, res as any, next);
    res.emit('finish');

    expect(consoleError).toHaveBeenCalledWith(
      'Error logging request:',
      expect.any(Error),
    );
    consoleError.mockRestore();
  });
});
