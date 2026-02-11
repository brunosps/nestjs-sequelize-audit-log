import { AuditLogRequestService } from '../audit-log-request.service';

describe('AuditLogRequestService', () => {
  it('should return undefined requestId when no context', async () => {
    const service = new AuditLogRequestService();
    const requestId = await service.getRequestId();
    expect(requestId).toBeUndefined();
  });
});
