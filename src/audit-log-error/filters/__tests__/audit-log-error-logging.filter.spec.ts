import { HttpException, HttpStatus } from '@nestjs/common';

import { AuditLogErrorLoggingFilter } from '../audit-log-error-logging.filter';

describe('AuditLogErrorLoggingFilter', () => {
  let filter: AuditLogErrorLoggingFilter;
  let mockAuditLogService: any;
  let mockResponse: any;
  let mockRequest: any;
  let mockHost: any;

  beforeEach(() => {
    mockAuditLogService = {
      registerLog: jest.fn(),
    };
    filter = new AuditLogErrorLoggingFilter(mockAuditLogService);

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockRequest = {
      url: '/api/test',
      method: 'GET',
      route: {
        path: '/api/test',
        methods: { get: true },
      },
    };
    mockHost = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      }),
    };
  });

  it('should handle HttpException and log ERROR', async () => {
    const exception = new HttpException('Not Found', HttpStatus.NOT_FOUND);

    await filter.catch(exception, mockHost as any);

    expect(mockAuditLogService.registerLog).toHaveBeenCalledWith(
      'ERROR',
      expect.objectContaining({
        errorType: 'HttpException',
        routePath: '/api/test',
        routeMethod: 'GET',
      }),
    );

    expect(mockResponse.status).toHaveBeenCalledWith(404);
    expect(mockResponse.json).toHaveBeenCalled();
  });

  it('should handle non-HttpException errors as 500', async () => {
    const exception = new Error('Something broke');

    await filter.catch(exception, mockHost as any);

    expect(mockAuditLogService.registerLog).toHaveBeenCalledWith(
      'ERROR',
      expect.objectContaining({
        errorType: 'Error',
        message: '"Internal server error"',
      }),
    );

    expect(mockResponse.status).toHaveBeenCalledWith(500);
  });

  it('should handle unknown exception types', async () => {
    await filter.catch('string error', mockHost as any);

    expect(mockAuditLogService.registerLog).toHaveBeenCalledWith(
      'ERROR',
      expect.objectContaining({
        errorType: 'UnknownError',
        stackTrace: '',
      }),
    );
  });

  it('should handle missing route info', async () => {
    mockRequest = { url: '/fallback', method: 'POST' };
    mockHost = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      }),
    };

    const exception = new Error('test');
    await filter.catch(exception, mockHost as any);

    expect(mockAuditLogService.registerLog).toHaveBeenCalledWith(
      'ERROR',
      expect.objectContaining({
        routePath: '/fallback',
        routeMethod: 'POST',
      }),
    );
  });

  it('should handle registerLog throwing error gracefully', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation();
    mockAuditLogService.registerLog.mockImplementation(() => {
      throw new Error('log failed');
    });

    const exception = new HttpException('Bad', 400);
    await filter.catch(exception, mockHost as any);

    expect(consoleError).toHaveBeenCalledWith(
      'Error saving error log:',
      expect.any(Error),
    );
    // Response should still be sent
    expect(mockResponse.status).toHaveBeenCalledWith(400);
    consoleError.mockRestore();
  });

  it('should extract multiple route methods', async () => {
    mockRequest.route.methods = { get: true, post: true };

    const exception = new Error('test');
    await filter.catch(exception, mockHost as any);

    const logCall = mockAuditLogService.registerLog.mock.calls[0][1];
    expect(logCall.routeMethod).toContain('GET');
    expect(logCall.routeMethod).toContain('POST');
  });
});
