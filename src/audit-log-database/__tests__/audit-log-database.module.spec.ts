import { AuditLogDatabaseModule } from '../audit-log-database.module';

describe('AuditLogDatabaseModule', () => {
  it('should return a DynamicModule from register()', () => {
    const result = AuditLogDatabaseModule.register({
      auditedTables: ['users', 'orders'],
    });

    expect(result.module).toBe(AuditLogDatabaseModule);
    const providers = result.providers as any[];
    const auditedTablesProvider = providers.find(
      (p) => p.provide === 'AUDITEDTABLES',
    );
    expect(auditedTablesProvider.useValue).toEqual(['users', 'orders']);
  });
});
