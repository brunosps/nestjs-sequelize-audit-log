import { AuditLogHttpService } from '../audit-log-http.service';

describe('AuditLogHttpService', () => {
  let service: AuditLogHttpService;
  let mockAuditLogService: any;
  let mockHttpService: any;
  let requestInterceptors: any[];
  let responseInterceptors: any[];

  beforeEach(() => {
    requestInterceptors = [];
    responseInterceptors = [];

    mockHttpService = {
      axiosRef: {
        interceptors: {
          request: {
            use: jest.fn((handler: any) => requestInterceptors.push(handler)),
          },
          response: {
            use: jest.fn((successHandler: any, errorHandler: any) => {
              responseInterceptors.push({ success: successHandler, error: errorHandler });
            }),
          },
        },
      },
    };

    mockAuditLogService = {
      registerLog: jest.fn(),
    };
  });

  describe('with logging enabled', () => {
    beforeEach(() => {
      service = new AuditLogHttpService(
        mockHttpService,
        mockAuditLogService,
        true, // enableLogging
      );
    });

    it('should setup interceptors on init', () => {
      service.onModuleInit();

      expect(mockHttpService.axiosRef.interceptors.request.use).toHaveBeenCalled();
      expect(mockHttpService.axiosRef.interceptors.response.use).toHaveBeenCalled();
    });

    it('should add metadata.startTime on request interceptor', async () => {
      service.onModuleInit();

      const config: any = { url: 'http://api.test.com', method: 'get' };
      const result = await requestInterceptors[0](config);
      expect(result.metadata).toBeDefined();
      expect(result.metadata.startTime).toBeDefined();
    });

    it('should log integration on successful response', async () => {
      service.onModuleInit();

      const config: any = {
        url: 'http://api.test.com/users',
        method: 'get',
        data: { query: 'test' },
        metadata: { startTime: Date.now() - 100 },
      };

      const response: any = {
        config,
        data: { users: [] },
        status: 200,
      };

      await responseInterceptors[0].success(response);

      expect(mockAuditLogService.registerLog).toHaveBeenCalledWith(
        'INTEGRATION',
        expect.objectContaining({
          integrationName: 'http://api.test.com/users',
          method: 'GET',
          status: '200',
        }),
      );
    });

    it('should log integration on error response', async () => {
      service.onModuleInit();

      const config: any = {
        url: 'http://api.test.com/fail',
        method: 'post',
        data: {},
        metadata: { startTime: Date.now() - 50 },
      };

      const error: any = {
        config,
        response: {
          data: { error: 'Not Found' },
          status: 404,
        },
      };

      await expect(responseInterceptors[0].error(error)).rejects.toBe(error);

      expect(mockAuditLogService.registerLog).toHaveBeenCalledWith(
        'INTEGRATION',
        expect.objectContaining({
          integrationName: 'http://api.test.com/fail',
          method: 'POST',
          status: '404',
        }),
      );
    });

    it('should handle error without response', async () => {
      service.onModuleInit();

      const error: any = {
        config: undefined,
        response: undefined,
      };

      await expect(responseInterceptors[0].error(error)).rejects.toBe(error);

      expect(mockAuditLogService.registerLog).toHaveBeenCalledWith(
        'INTEGRATION',
        expect.objectContaining({
          integrationName: 'unknown',
          method: 'UNKNOWN',
          status: 'ERROR',
        }),
      );
    });
  });

  describe('with logging disabled', () => {
    it('should not setup interceptors', () => {
      service = new AuditLogHttpService(
        mockHttpService,
        mockAuditLogService,
        false,
      );

      service.onModuleInit();

      expect(mockHttpService.axiosRef.interceptors.request.use).not.toHaveBeenCalled();
      expect(mockHttpService.axiosRef.interceptors.response.use).not.toHaveBeenCalled();
    });
  });
});
