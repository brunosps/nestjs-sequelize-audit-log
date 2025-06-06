// Main module exports
export { AuditLogModule } from './audit-log.module';

// Core module exports
export { AuditLogCoreModule } from './audit-log-core/audit-log-core.module';

// Integration module exports
export { AuditLogIntegrationModule } from './audit-log-integration/audit-log-integration.module';

// Service exports
export { AuditLogService } from './audit-log-core/services/audit-log.service';
export { PayloadDetailsService } from './audit-log-core/services/payload-details.service';

// SOAP Client exports
export { AuditLogSoapClientService } from './audit-log-integration/services/audit-log-soap-client.service';
export {
  createAuditSoapClient,
  initializeSoapClientUtils,
  SoapClient,
} from './audit-log-integration/utils/soap-client.utils';

// Event module exports
export { AuditLogEvent } from './audit-log-event/decorators/audit-log-event.decorator';

// Utility exports
export { extractClientIp } from './utils/ip';
export { sanitizePayload, sanitizeXmlPayload } from './utils/sanitizePayload';

// Interface exports
export type { AuditLogModuleOptions } from './interfaces/audit-log-module-options.interface';
