import { AuditLogService } from '../audit-log.service';

const mockSave = jest.fn();

const createMockModel = () => ({
  create: jest.fn().mockResolvedValue({ id: 'log-1' }),
  destroy: jest.fn().mockResolvedValue(1),
});

jest.mock('uuid', () => ({
  v4: () => 'mock-uuid',
}));

describe('AuditLogService', () => {
  let service: AuditLogService;
  let auditLogModel: any;
  let auditLogEventModel: any;
  let auditLogEntityModel: any;
  let auditLogErrorModel: any;
  let auditLogIntegrationModel: any;
  let auditLogRequestModel: any;
  let auditLogLoginModel: any;
  let auditLogDetailModel: any;
  let payloadDetailsService: any;

  beforeEach(() => {
    jest.clearAllMocks();
    auditLogModel = {
      create: jest.fn().mockResolvedValue({ id: 'log-1', save: mockSave, userId: 'system' }),
      destroy: jest.fn().mockResolvedValue(1),
    };
    auditLogEventModel = createMockModel();
    auditLogEntityModel = createMockModel();
    auditLogErrorModel = createMockModel();
    auditLogIntegrationModel = createMockModel();
    auditLogRequestModel = createMockModel();
    auditLogLoginModel = createMockModel();
    auditLogDetailModel = createMockModel();
    payloadDetailsService = {
      processPayload: jest.fn().mockResolvedValue('processed'),
      getFullPayload: jest.fn().mockResolvedValue('full'),
    };

    service = new AuditLogService(
      auditLogModel,
      auditLogEventModel,
      auditLogEntityModel,
      auditLogErrorModel,
      auditLogIntegrationModel,
      auditLogRequestModel,
      auditLogLoginModel,
      auditLogDetailModel,
      payloadDetailsService,
      30, // logRetentionDays
      undefined, // getUserIdFn
      undefined, // getIpAddressFn
    );
  });

  describe('getUserInformation', () => {
    it('should return default system user when no request in context', () => {
      const info = service.getUserInformation();
      expect(info.id).toBe('system');
      expect(info.ip).toBe('0.0.0.0');
    });

    it('should extract user from request context', () => {
      const req = {
        user: { id: 'user-42' },
        headers: {},
        connection: { remoteAddress: '192.168.1.1' },
      };

      const result = AuditLogService.runWithRequest(req as any, () => {
        return service.getUserInformation();
      });

      expect(result.id).toBe('user-42');
      expect(result.ip).toBe('192.168.1.1');
    });

    it('should use getUserIdFn when provided', () => {
      const getUserIdFn = jest.fn().mockReturnValue('custom-id');
      const svc = new AuditLogService(
        auditLogModel, auditLogEventModel, auditLogEntityModel,
        auditLogErrorModel, auditLogIntegrationModel, auditLogRequestModel,
        auditLogLoginModel, auditLogDetailModel, payloadDetailsService, 30,
        getUserIdFn, undefined,
      );

      const req = { user: { id: '10' }, headers: {}, connection: {} } as any;
      const result = AuditLogService.runWithRequest(req, () => svc.getUserInformation());
      expect(result.id).toBe('custom-id');
    });

    it('should use getIpAddressFn when provided', () => {
      const getIpFn = jest.fn().mockReturnValue('99.99.99.99');
      const svc = new AuditLogService(
        auditLogModel, auditLogEventModel, auditLogEntityModel,
        auditLogErrorModel, auditLogIntegrationModel, auditLogRequestModel,
        auditLogLoginModel, auditLogDetailModel, payloadDetailsService, 30,
        undefined, getIpFn,
      );

      const req = { user: { id: '10' }, headers: {}, connection: {} } as any;
      const result = AuditLogService.runWithRequest(req, () => svc.getUserInformation());
      expect(result.ip).toBe('99.99.99.99');
    });
  });

  describe('logEvent', () => {
    it('should call registerLog with EVENT type', async () => {
      const spy = jest.spyOn(service, 'registerLog').mockResolvedValue(undefined);
      const data = { type: 'TEST', description: 'test' };
      await service.logEvent(data);
      expect(spy).toHaveBeenCalledWith('EVENT', data);
    });
  });

  describe('registerLog', () => {
    it('should create parent log and EVENT child', async () => {
      await service.registerLog('EVENT', {
        type: 'MY_EVENT',
        description: 'desc',
        details: { a: 1 },
        eventStatus: 'SUCCESS',
      });

      expect(auditLogModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'mock-uuid',
          logType: 'EVENT',
        }),
      );

      expect(auditLogEventModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          logId: 'log-1',
          eventType: 'MY_EVENT',
          eventDescription: 'desc',
          eventStatus: 'SUCCESS',
        }),
      );
    });

    it('should create ERROR child log', async () => {
      await service.registerLog('ERROR', {
        message: 'error msg',
        errorType: 'TypeError',
        stackTrace: 'stack...',
        routePath: '/api/test',
        routeMethod: 'GET',
      });

      expect(auditLogErrorModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          logId: 'log-1',
          errorMessage: 'error msg',
          errorType: 'TypeError',
        }),
      );
    });

    it('should create ENTITY child log', async () => {
      await service.registerLog('ENTITY', {
        action: 'CREATE',
        entity: 'users',
        changedValues: { name: 'John' },
        entityPk: { id: 1 },
        entityKey: '1',
      });

      expect(auditLogEntityModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          logId: 'log-1',
          action: 'CREATE',
          entity: 'users',
        }),
      );
    });

    it('should create INTEGRATION child log with compressed payloads', async () => {
      await service.registerLog('INTEGRATION', {
        integrationName: 'api-test',
        method: 'POST',
        requestPayload: 'req',
        responsePayload: 'res',
        status: '200',
        duration: 100,
      });

      expect(auditLogIntegrationModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          logId: 'log-1',
          integrationName: 'api-test',
          method: 'POST',
        }),
      );
    });

    it('should create REQUEST child log', async () => {
      await service.registerLog('REQUEST', {
        requestMethod: 'GET',
        requestURL: '/api/data',
        responseStatus: 200,
        responseSize: 1024,
        duration: 50,
        payload: '{}',
        responseBody: '{"ok":true}',
      });

      expect(auditLogRequestModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          logId: 'log-1',
          requestMethod: 'GET',
        }),
      );
    });

    it('should create LOGIN child log and optionally request log', async () => {
      auditLogModel.create.mockResolvedValueOnce({
        id: 'log-1',
        save: mockSave,
        userId: 'system',
      });

      await service.registerLog('LOGIN', {
        system: 'web',
        registerRequest: true,
        userId: 'login-user',
        request: {
          requestMethod: 'POST',
          requestURL: '/auth/login',
          responseStatus: 200,
          responseSize: 50,
          duration: 30,
          payload: '{}',
        },
      });

      expect(auditLogLoginModel.create).toHaveBeenCalled();
      expect(auditLogRequestModel.create).toHaveBeenCalled();
      expect(mockSave).toHaveBeenCalled();
    });

    it('should handle eventStatus defaulting to SUCCESS', async () => {
      await service.registerLog('EVENT', {
        type: 'NO_STATUS',
        description: 'no status provided',
      });

      expect(auditLogEventModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          eventStatus: 'SUCCESS',
        }),
      );
    });

    it('should handle errors gracefully', async () => {
      const loggerError = jest.spyOn((service as any).logger, 'error').mockImplementation();
      auditLogModel.create.mockRejectedValueOnce(new Error('DB error'));

      await service.registerLog('EVENT', { type: 'FAIL', description: 'fail' });

      expect(loggerError).toHaveBeenCalledWith(
        expect.stringContaining('Error registering audit log'),
        expect.any(Error),
      );
      loggerError.mockRestore();
    });

    it('should handle integration with object payloads', async () => {
      await service.registerLog('INTEGRATION', {
        integrationName: 'api',
        method: 'GET',
        requestPayload: { foo: 'bar' } as any,
        responsePayload: null as any,
        status: '200',
        duration: 10,
      });

      expect(auditLogIntegrationModel.create).toHaveBeenCalled();
    });
  });

  describe('clearLogs', () => {
    it('should delete old logs from appropriate models', async () => {
      await service.clearLogs();

      expect(auditLogErrorModel.destroy).toHaveBeenCalled();
      expect(auditLogIntegrationModel.destroy).toHaveBeenCalled();
      expect(auditLogRequestModel.destroy).toHaveBeenCalled();
      expect(auditLogDetailModel.destroy).toHaveBeenCalled();
      expect(auditLogModel.destroy).toHaveBeenCalled();

      // Event and Entity are commented out (not cleaned)
      expect(auditLogEventModel.destroy).not.toHaveBeenCalled();
      expect(auditLogEntityModel.destroy).not.toHaveBeenCalled();
      expect(auditLogLoginModel.destroy).not.toHaveBeenCalled();
    });
  });

  describe('runWithRequest', () => {
    it('should provide request context to callbacks', () => {
      const req = { user: { id: 'ctx-user' }, headers: {} } as any;
      const result = AuditLogService.runWithRequest(req, () => 'done');
      expect(result).toBe('done');
    });
  });
});
