import { AuditLogEventService } from '../audit-log-event.service';

describe('AuditLogEventService', () => {
  let service: AuditLogEventService;
  let mockAuditLogService: { logEvent: jest.Mock };

  beforeEach(() => {
    mockAuditLogService = { logEvent: jest.fn().mockResolvedValue('log-1') };
    service = new AuditLogEventService(mockAuditLogService as any);
  });

  it('should call auditLogService.logEvent with provided data', async () => {
    const data = {
      type: 'TEST',
      description: 'test event',
      userId: 'user-1',
      ipAddress: '10.0.0.1',
      details: { key: 'value' },
      eventStatus: 'SUCCESS',
    };

    await service.logEvent(data);

    expect(mockAuditLogService.logEvent).toHaveBeenCalledWith(data, undefined);
  });

  it('should call logEvent with minimal data', async () => {
    const data = {
      type: 'MINIMAL',
      description: 'minimal event',
    };

    await service.logEvent(data);

    expect(mockAuditLogService.logEvent).toHaveBeenCalledWith(data, undefined);
  });

  it('should return the log id as protocol', async () => {
    const protocol = await service.logEvent({
      type: 'TEST',
      description: 'test event',
    });

    expect(protocol).toBe('log-1');
  });

  it('should return null when the underlying write fails', async () => {
    mockAuditLogService.logEvent.mockResolvedValue(null);

    const protocol = await service.logEvent({
      type: 'TEST',
      description: 'test event',
    });

    expect(protocol).toBeNull();
  });
});
