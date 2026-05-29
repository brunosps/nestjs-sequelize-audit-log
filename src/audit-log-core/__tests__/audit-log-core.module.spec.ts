import { AuditLogCoreModule } from '../audit-log-core.module';
import { AUDIT_LOG_MODELS } from '../providers/audit-log-models.provider';

describe('AuditLogCoreModule', () => {
  it('should return a DynamicModule from register()', () => {
    const result = AuditLogCoreModule.register({
      modelModule: class MockModelModule {},
      logRetentionDays: 30,
    });

    expect(result.module).toBe(AuditLogCoreModule);
    expect(result.providers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          provide: 'LOG_RETENTION_DAYS',
          useValue: 30,
        }),
      ]),
    );
    expect(result.exports).toEqual(
      expect.arrayContaining([expect.any(Function)]),
    );
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
    const userIdProvider = providers.find(
      (p) => p.provide === 'GET_USERID_FUNCTION',
    );
    const ipProvider = providers.find(
      (p) => p.provide === 'GET_IPADDRESS_FUNCTION',
    );

    expect(userIdProvider.useValue).toBe(getUserId);
    expect(ipProvider.useValue).toBe(getIpAddress);
  });

  it('should resolve audit models from dedicated sequelize when available', () => {
    const result = AuditLogCoreModule.register({
      modelModule: class MockModelModule {},
      logRetentionDays: 30,
    });

    const providers = result.providers as any[];
    const modelsProvider = providers.find(
      (p) => p.provide === AUDIT_LOG_MODELS,
    );
    const dedicatedModels = {
      AuditLogModel: { tableName: 'audit_logs', source: 'dedicated' },
      AuditLogEventModel: {
        tableName: 'audit_logs_event',
        source: 'dedicated',
      },
      AuditLogEntityModel: {
        tableName: 'audit_logs_entity',
        source: 'dedicated',
      },
      AuditLogErrorModel: {
        tableName: 'audit_logs_error',
        source: 'dedicated',
      },
      AuditLogIntegrationModel: {
        tableName: 'audit_logs_integration',
        source: 'dedicated',
      },
      AuditLogRequestModel: {
        tableName: 'audit_logs_request',
        source: 'dedicated',
      },
      AuditLogLoginModel: {
        tableName: 'audit_logs_login',
        source: 'dedicated',
      },
      AuditLogDetailModel: {
        tableName: 'audit_logs_details',
        source: 'dedicated',
      },
    };

    const resolved = modelsProvider.useFactory(
      { models: dedicatedModels },
      { source: 'fallback' },
      { source: 'fallback' },
      { source: 'fallback' },
      { source: 'fallback' },
      { source: 'fallback' },
      { source: 'fallback' },
      { source: 'fallback' },
      { source: 'fallback' },
    );

    expect(resolved.auditLogModel).toBe(dedicatedModels.AuditLogModel);
    expect(resolved.auditLogRequestModel).toBe(
      dedicatedModels.AuditLogRequestModel,
    );
  });

  it('should fall back to default injected models when dedicated sequelize is unavailable', () => {
    const result = AuditLogCoreModule.register({
      modelModule: class MockModelModule {},
      logRetentionDays: 30,
    });

    const providers = result.providers as any[];
    const modelsProvider = providers.find(
      (p) => p.provide === AUDIT_LOG_MODELS,
    );
    const fallbackAuditLogModel = { source: 'fallback-audit-log' };

    const resolved = modelsProvider.useFactory(
      null,
      fallbackAuditLogModel,
      { source: 'fallback-event' },
      { source: 'fallback-entity' },
      { source: 'fallback-error' },
      { source: 'fallback-integration' },
      { source: 'fallback-request' },
      { source: 'fallback-login' },
      { source: 'fallback-detail' },
    );

    expect(resolved.auditLogModel).toBe(fallbackAuditLogModel);
  });
});
