import { AuditLogIntegrationModule } from '../audit-log-integration.module';

describe('AuditLogIntegrationModule', () => {
  it('should return a DynamicModule from register()', () => {
    const result = AuditLogIntegrationModule.register({
      enableLogging: true,
    });

    expect(result.module).toBe(AuditLogIntegrationModule);
    const providers = result.providers as any[];
    const enableProvider = providers.find(
      (p) => p.provide === 'ENABLE_INTEGRATION_LOGGING',
    );
    expect(enableProvider.useValue).toBe(true);
  });

  it('should default enableLogging to false', () => {
    const result = AuditLogIntegrationModule.register();

    const providers = result.providers as any[];
    const enableProvider = providers.find(
      (p) => p.provide === 'ENABLE_INTEGRATION_LOGGING',
    );
    expect(enableProvider.useValue).toBe(false);
  });
});
