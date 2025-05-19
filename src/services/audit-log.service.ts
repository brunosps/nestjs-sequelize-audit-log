import { Injectable, Inject } from '@nestjs/common';
import { AuditLogEventService } from '../audit-log-event/services/audit-log-event.service';
import { AuditLogDatabaseService } from '../audit-log-database/services/audit-log-database.service';
import { AuditLogModuleOptions } from '../interfaces/audit-log-module-options.interface';

@Injectable()
export class AuditLogService {
  constructor(
    private readonly auditLogEventService: AuditLogEventService,
    private readonly auditLogDatabaseService: AuditLogDatabaseService,
    @Inject('AUDIT_LOG_OPTIONS')
    private readonly options: AuditLogModuleOptions,
  ) {}

  /**
   * Logs a custom event.
   * @param eventType Type of the event (e.g., 'USER_ACTION', 'SYSTEM_EVENT').
   * @param eventDescription A human-readable description of the event.
   * @param eventDetails Any additional details about the event (can be an object).
   * @param userId Optional ID of the user associated with the event.
   * @param ipAddress Optional IP address associated with the event.
   */
  logEvent(
    eventType: string,
    eventDescription: string,
    eventDetails: any,
    userId?: string,
    ipAddress?: string,
  ): Promise<void> {
    return this.auditLogEventService.logEvent(
      eventType,
      eventDescription,
      eventDetails,
      userId,
      ipAddress,
    );
  }

  /**
   * Logs a database change.
   * @param action The action performed (e.g., 'CREATE', 'UPDATE', 'DELETE').
   * @param tableName The name of the table that was changed.
   * @param recordId The ID of the record that was changed.
   * @param oldValues Optional object representing the values before the change.
   * @param newValues Optional object representing the values after the change.
   */
  logDatabaseChange(
    action: string,
    tableName: string,
    recordId: string,
    oldValues?: any,
    newValues?: any,
  ): Promise<void> {
    // Assuming logDatabaseChange in AuditLogDatabaseService has a similar signature
    // or adjust the call as per its actual signature.
    return this.auditLogDatabaseService.logDatabaseChange(
      action,
      tableName,
      recordId,
      oldValues,
      newValues,
    );
  }

  // Example of how it might have been called incorrectly, leading to TS2554
  // async someMethodThatLogsAnEvent(eventData: { type: string, description: string, details: any, user?: string, ip?: string }) {
  //   // Incorrect call if eventData is a single object:
  //   // await this.auditLogEventService.logEvent(eventData);
  //
  //   // Correct call:
  //   await this.auditLogEventService.logEvent(
  //     eventData.type,
  //     eventData.description,
  //     eventData.details,
  //     eventData.user,
  //     eventData.ip
  //   );
  // }
}
