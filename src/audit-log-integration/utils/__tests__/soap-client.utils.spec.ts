import {
  initializeSoapClientUtils,
  createAuditSoapClient,
  SoapClient,
} from '../soap-client.utils';

jest.mock('soap', () => ({
  createClientAsync: jest.fn().mockResolvedValue({ on: jest.fn() }),
}));

describe('soap-client.utils', () => {
  describe('createAuditSoapClient', () => {
    it('should fallback to plain SOAP client when not initialized', async () => {
      // Reset module state
      jest.resetModules();
      const { createClientAsync } = require('soap');
      const { createAuditSoapClient: freshCreate } = require('../soap-client.utils');

      const client = await freshCreate('http://test.wsdl');

      expect(createClientAsync).toHaveBeenCalledWith(
        'http://test.wsdl',
        undefined,
        undefined,
      );
      expect(client).toBeDefined();
    });

    it('should create client through SoapClientService when initialized', async () => {
      const mockSoapClientService = {
        createAsyncClient: jest.fn().mockResolvedValue({ on: jest.fn() }),
      };
      const mockModuleRef = {
        get: jest.fn().mockReturnValue(mockSoapClientService),
      };

      initializeSoapClientUtils(mockModuleRef as any);

      const client = await createAuditSoapClient(
        'http://test.wsdl',
        { timeout: 30000 },
        'http://endpoint',
      );

      expect(mockSoapClientService.createAsyncClient).toHaveBeenCalledWith(
        'http://test.wsdl',
        { timeout: 30000 },
        'http://endpoint',
      );
    });
  });

  describe('SoapClient export', () => {
    it('should export createAuditSoapClient', () => {
      expect(SoapClient.createAuditSoapClient).toBe(createAuditSoapClient);
    });
  });
});
