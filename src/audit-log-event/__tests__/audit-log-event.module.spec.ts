import { AuditLogEventModule } from '../audit-log-event.module';

describe('AuditLogEventModule', () => {
  it('should return a DynamicModule from register()', () => {
    const result = AuditLogEventModule.register();

    expect(result.module).toBe(AuditLogEventModule);
    expect(result.providers).toBeDefined();
    expect(result.exports).toBeDefined();
    expect(result.imports).toBeDefined();
  });

  it('should set global AUDIT_LOG_SERVICE on construction', () => {
    const mockEventService = { logEvent: jest.fn() };
    const mod = new AuditLogEventModule(mockEventService as any);
    expect((global as any)['AUDIT_LOG_SERVICE']).toBe(mockEventService);
  });
});
