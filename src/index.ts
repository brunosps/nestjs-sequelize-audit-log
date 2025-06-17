// Main module exports
export { AuditLogModule } from './audit-log.module';

// Service exports
export { AuditLogService } from './audit-log-core/services/audit-log.service';
export { PayloadDetailsService } from './audit-log-core/services/payload-details.service';

// Event module exports
export { AuditLogEvent } from './audit-log-event/decorators/audit-log-event.decorator';

// Integration module exports
export { SoapClientUtilsProvider } from './audit-log-integration/providers/soap-client-utils.provider';
export { AuditLogSoapClientService } from './audit-log-integration/services/audit-log-soap-client.service';
export {
  createAuditSoapClient,
  SoapClient,
} from './audit-log-integration/utils/soap-client.utils';

// Utility exports
export { extractClientIp } from './utils/ip';

// Interface exports
export type { AuditLogModuleOptions } from './interfaces/audit-log-module-options.interface';
