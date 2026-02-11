import { SoapClientUtilsProvider } from '../soap-client-utils.provider';

jest.mock('../../utils/soap-client.utils', () => ({
  initializeSoapClientUtils: jest.fn(),
}));

describe('SoapClientUtilsProvider', () => {
  it('should call initializeSoapClientUtils on module init', () => {
    const { initializeSoapClientUtils } = require('../../utils/soap-client.utils');

    const mockModuleRef: any = { get: jest.fn() };
    const provider = new SoapClientUtilsProvider(mockModuleRef);

    provider.onModuleInit();

    expect(initializeSoapClientUtils).toHaveBeenCalledWith(mockModuleRef);
  });
});
