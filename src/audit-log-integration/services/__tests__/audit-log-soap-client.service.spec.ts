import { AuditLogSoapClientService } from '../audit-log-soap-client.service';

jest.mock('soap', () => ({
  createClientAsync: jest.fn(),
}));

describe('AuditLogSoapClientService', () => {
  let service: AuditLogSoapClientService;
  let mockAuditLogService: any;
  const { createClientAsync } = require('soap');

  beforeEach(() => {
    jest.clearAllMocks();
    mockAuditLogService = {
      registerLog: jest.fn(),
    };
  });

  describe('with logging enabled', () => {
    beforeEach(() => {
      service = new AuditLogSoapClientService(mockAuditLogService, true);
    });

    it('should create client and setup logging', async () => {
      const mockClient: any = {
        on: jest.fn(),
      };
      createClientAsync.mockResolvedValue(mockClient);

      const client = await service.createAsyncClient('http://test.wsdl');

      expect(createClientAsync).toHaveBeenCalledWith('http://test.wsdl', undefined, undefined);
      expect(mockClient.on).toHaveBeenCalledWith('request', expect.any(Function));
      expect(mockClient.on).toHaveBeenCalledWith('response', expect.any(Function));
      expect(mockClient.on).toHaveBeenCalledWith('soapError', expect.any(Function));
    });

    it('should log successful SOAP response', async () => {
      const listeners: Record<string, Function> = {};
      const mockClient: any = {
        on: jest.fn((event: string, handler: Function) => {
          listeners[event] = handler;
        }),
      };
      createClientAsync.mockResolvedValue(mockClient);

      await service.createAsyncClient('http://test.wsdl');

      // Simulate request
      const requestXml = '<soap:Envelope><soap:Body><MyMethod><param>value</param></MyMethod></soap:Body></soap:Envelope>';
      listeners['request'](requestXml, 'eid-1');

      // Simulate response
      const responseXml = '<soap:Envelope><soap:Body><MyMethodResponse>ok</MyMethodResponse></soap:Body></soap:Envelope>';
      listeners['response'](responseXml, 'eid-1');

      expect(mockAuditLogService.registerLog).toHaveBeenCalledWith(
        'INTEGRATION',
        expect.objectContaining({
          method: 'MyMethod',
          status: '200',
        }),
      );
    });

    it('should log SOAP error', async () => {
      const listeners: Record<string, Function> = {};
      const mockClient: any = {
        on: jest.fn((event: string, handler: Function) => {
          listeners[event] = handler;
        }),
      };
      createClientAsync.mockResolvedValue(mockClient);

      await service.createAsyncClient('http://test.wsdl');

      const requestXml = '<soap:Envelope><soap:Body><FailMethod></FailMethod></soap:Body></soap:Envelope>';
      listeners['request'](requestXml, 'eid-1');
      listeners['soapError']({ message: 'SOAP fault' }, 'eid-1');

      expect(mockAuditLogService.registerLog).toHaveBeenCalledWith(
        'INTEGRATION',
        expect.objectContaining({
          status: '500',
        }),
      );
    });
  });

  describe('with logging disabled', () => {
    beforeEach(() => {
      service = new AuditLogSoapClientService(mockAuditLogService, false);
    });

    it('should create client without logging setup', async () => {
      const mockClient: any = { on: jest.fn() };
      createClientAsync.mockResolvedValue(mockClient);

      const client = await service.createAsyncClient('http://test.wsdl');

      expect(client).toBe(mockClient);
      expect(mockClient.on).not.toHaveBeenCalled();
    });
  });

  describe('setupClientLogging', () => {
    it('should extract SOAP method from body', async () => {
      service = new AuditLogSoapClientService(mockAuditLogService, true);

      const listeners: Record<string, Function> = {};
      const mockClient: any = {
        on: jest.fn((event: string, handler: Function) => {
          listeners[event] = handler;
        }),
      };

      service.setupClientLogging(mockClient, 'http://wsdl.url');

      const xml = '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body><ns:ConsultarCliente xmlns:ns="http://example.com"><cpf>123</cpf></ns:ConsultarCliente></soap:Body></soap:Envelope>';
      listeners['request'](xml, 'eid');
      listeners['response']('<response/>', 'eid');

      expect(mockAuditLogService.registerLog).toHaveBeenCalledWith(
        'INTEGRATION',
        expect.objectContaining({
          method: 'ConsultarCliente',
        }),
      );
    });

    it('should return SOAP_CALL when method cannot be extracted', async () => {
      service = new AuditLogSoapClientService(mockAuditLogService, true);

      const listeners: Record<string, Function> = {};
      const mockClient: any = {
        on: jest.fn((event: string, handler: Function) => {
          listeners[event] = handler;
        }),
      };

      service.setupClientLogging(mockClient, 'http://wsdl.url');

      listeners['request']('<malformed>', 'eid');
      listeners['response']('<response/>', 'eid');

      expect(mockAuditLogService.registerLog).toHaveBeenCalledWith(
        'INTEGRATION',
        expect.objectContaining({
          method: 'SOAP_CALL',
        }),
      );
    });

    it('should return SOAP_CALL for empty body content', async () => {
      service = new AuditLogSoapClientService(mockAuditLogService, true);

      const listeners: Record<string, Function> = {};
      const mockClient: any = {
        on: jest.fn((event: string, handler: Function) => {
          listeners[event] = handler;
        }),
      };

      service.setupClientLogging(mockClient, 'http://wsdl.url');

      listeners['request']('<soap:Envelope><soap:Body></soap:Body></soap:Envelope>', 'eid');
      listeners['response']('<response/>', 'eid');

      expect(mockAuditLogService.registerLog).toHaveBeenCalledWith(
        'INTEGRATION',
        expect.objectContaining({
          method: 'SOAP_CALL',
        }),
      );
    });

    it('should handle soapError with root.Envelope', async () => {
      service = new AuditLogSoapClientService(mockAuditLogService, true);

      const listeners: Record<string, Function> = {};
      const mockClient: any = {
        on: jest.fn((event: string, handler: Function) => {
          listeners[event] = handler;
        }),
      };

      service.setupClientLogging(mockClient, 'http://wsdl.url', 'http://endpoint.url');

      listeners['request']('<soap:Body><TestOp/></soap:Body>', 'eid');
      listeners['soapError']({ root: { Envelope: '<fault/>' } }, 'eid');

      expect(mockAuditLogService.registerLog).toHaveBeenCalledWith(
        'INTEGRATION',
        expect.objectContaining({
          status: '500',
          integrationName: expect.stringContaining('http://wsdl.url'),
        }),
      );
    });

    it('should build integration name with endpoint', async () => {
      service = new AuditLogSoapClientService(mockAuditLogService, true);

      const listeners: Record<string, Function> = {};
      const mockClient: any = {
        on: jest.fn((event: string, handler: Function) => {
          listeners[event] = handler;
        }),
      };

      service.setupClientLogging(mockClient, undefined, 'http://endpoint.url');

      const xml = '<soap:Envelope><soap:Body><MyOp/></soap:Body></soap:Envelope>';
      listeners['request'](xml, 'eid');
      listeners['soapError']({ message: 'fail' }, 'eid');

      const call = mockAuditLogService.registerLog.mock.calls[0][1];
      expect(call.integrationName).toContain('http://endpoint.url');
      expect(call.method).toBe('MyOp');
    });

    it('should handle saveLog error gracefully', async () => {
      service = new AuditLogSoapClientService(mockAuditLogService, true);
      mockAuditLogService.registerLog.mockImplementation(() => {
        throw new Error('log failed');
      });

      const listeners: Record<string, Function> = {};
      const mockClient: any = {
        on: jest.fn((event: string, handler: Function) => {
          listeners[event] = handler;
        }),
      };

      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      service.setupClientLogging(mockClient, 'http://wsdl.url');

      const xml = '<soap:Body><TestOp/></soap:Body>';
      listeners['request'](xml, 'eid');
      // The response handler calls saveLog which calls registerLog
      listeners['response']('<response/>', 'eid');

      // Wait for the catch handler
      await new Promise(resolve => setTimeout(resolve, 10));
      consoleError.mockRestore();
    });
  });
});
