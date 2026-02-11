import { AuditLogRequestModule } from '../audit-log-request.module';

describe('AuditLogRequestModule', () => {
  it('should return a DynamicModule from register()', () => {
    const authRoutes = [
      { path: '/auth/login', methods: ['POST'], system: 'auth' },
    ];

    const result = AuditLogRequestModule.register({ authRoutes });

    expect(result.module).toBe(AuditLogRequestModule);
    const providers = result.providers as any[];
    const authProvider = providers.find((p) => p.provide === 'AUTH_ROUTES');
    expect(authProvider.useValue).toEqual(authRoutes);
    expect(result.exports).toEqual(expect.arrayContaining([expect.any(Function)]));
  });

  it('should register without auth routes', () => {
    const result = AuditLogRequestModule.register({});

    expect(result.module).toBe(AuditLogRequestModule);
    const providers = result.providers as any[];
    const authProvider = providers.find((p) => p.provide === 'AUTH_ROUTES');
    expect(authProvider.useValue).toBeUndefined();
  });
});
