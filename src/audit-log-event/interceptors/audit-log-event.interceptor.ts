import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { AuditLogEventService } from '../services/audit-log-event.service';
import { AUDIT_LOG_EVENT_METADATA } from '../decorators/audit-log-event.decorator';

interface EventMetadata {
  type: string;
  description: (context: ExecutionContext, result: any, error?: any) => string;
  details?: (context: ExecutionContext, result: any, error?: any) => any;
}

@Injectable()
export class AuditLogEventInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly auditLogEventService: AuditLogEventService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const eventMetadata = this.reflector.get<EventMetadata | undefined>(
      AUDIT_LOG_EVENT_METADATA,
      context.getHandler(),
    );

    if (!eventMetadata) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;
    const ipAddress = request.ip;

    return next.handle().pipe(
      tap({
        next: (result) => {
          const description = eventMetadata.description(context, result);
          const eventDetailsData = eventMetadata.details
            ? eventMetadata.details(context, result)
            : undefined;
          this.auditLogEventService.logEvent(
            eventMetadata.type,
            description,
            eventDetailsData,
            userId,
            ipAddress,
          );
        },
        error: (error) => {
          // Optionally log events on error too
          const description = eventMetadata.description(
            context,
            undefined,
            error,
          );
          const eventDetailsData = eventMetadata.details
            ? eventMetadata.details(context, undefined, error)
            : undefined;
          this.auditLogEventService.logEvent(
            `${eventMetadata.type}_ERROR`, // Distinguish error events
            description,
            eventDetailsData, // Or specific error details
            userId,
            ipAddress,
          );
        },
      }),
    );
  }
}
