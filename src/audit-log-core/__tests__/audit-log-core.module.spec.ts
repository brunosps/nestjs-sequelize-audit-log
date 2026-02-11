import { AuditLogCoreModule } from '../audit-log-core.module';

describe('AuditLogCoreModule', () => {
  it('should return a DynamicModule from register()', () => {
    const result = AuditLogCoreModule.register({
      modelModule: class MockModelModule {},
      logRetentionDays: 30,
    });

    expect(result.module).toBe(AuditLogCoreModule);
    expect(result.providers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ provide: 'LOG_RETENTION_DAYS', useValue: 30 }),
      ]),
    );
    expect(result.exports).toEqual(expect.arrayContaining([expect.any(Function)]));
  });

  it('should include getUserId and getIpAddress providers', () => {
    const getUserId = jest.fn();
    const getIpAddress = jest.fn();

    const result = AuditLogCoreModule.register({
      modelModule: class MockModelModule {},
      logRetentionDays: 60,
      getUserId,
      getIpAddress,
    });

    const providers = result.providers as any[];
    const userIdProvider = providers.find((p) => p.provide === 'GET_USERID_FUNCTION');
    const ipProvider = providers.find((p) => p.provide === 'GET_IPADDRESS_FUNCTION');

    expect(userIdProvider.useValue).toBe(getUserId);
    expect(ipProvider.useValue).toBe(getIpAddress);
  });
});
