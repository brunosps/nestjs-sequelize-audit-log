// Main module exports
export { AuditLogModule } from './audit-log.module';

// Service exports
export { AuditLogService } from './audit-log-core/services/audit-log.service';

// Event module exports
export { AuditLogEvent } from './audit-log-event/decorators/audit-log-event.decorator';

// Utility exports
export { extractClientIp } from './utils/ip';
