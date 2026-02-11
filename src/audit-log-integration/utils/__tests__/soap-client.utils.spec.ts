import {
  initializeSoapClientUtils,
  createAuditSoapClient,
  SoapClient,
} from '../soap-client.utils';

describe('soap-client.utils', () => {
  describe('createAuditSoapClient', () => {
    it('should throw when not initialized', async () => {
      // Reset module state
      jest.resetModules();
      const { createAuditSoapClient: freshCreate } = require('../soap-client.utils');

      await expect(freshCreate('http://test.wsdl')).rejects.toThrow(
        'SoapClientUtils não foi inicializado',
      );
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
