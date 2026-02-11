import { AuditLogErrorModule } from '../audit-log-error.module';

describe('AuditLogErrorModule', () => {
  it('should return a DynamicModule from register()', () => {
    const result = AuditLogErrorModule.register();

    expect(result.module).toBe(AuditLogErrorModule);
    expect(result.providers).toBeDefined();
    expect(result.imports).toBeDefined();
  });
});
