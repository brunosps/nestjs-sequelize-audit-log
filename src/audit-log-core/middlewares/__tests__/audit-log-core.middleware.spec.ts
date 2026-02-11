import { AuditLogCoreMiddleware } from '../audit-log-core.middleware';
import { AuditLogService } from '../../services/audit-log.service';

describe('AuditLogCoreMiddleware', () => {
  let middleware: AuditLogCoreMiddleware;

  beforeEach(() => {
    middleware = new AuditLogCoreMiddleware();
  });

  it('should call next()', () => {
    const req: any = { user: { id: '1' }, headers: {} };
    const res: any = {};
    const next = jest.fn();

    middleware.use(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('should bind request to AsyncLocalStorage context', () => {
    const req: any = { user: { id: 'test-user' }, headers: {} };
    const res: any = {};

    let capturedReq: any;
    const next = () => {
      // Inside next, the request should be available via AsyncLocalStorage
      // We verify by using runWithRequest which uses the same ALS
      capturedReq = (AuditLogService as any).asyncLocalStorage.getStore();
    };

    middleware.use(req, res, next);
    expect(capturedReq).toBe(req);
  });
});
