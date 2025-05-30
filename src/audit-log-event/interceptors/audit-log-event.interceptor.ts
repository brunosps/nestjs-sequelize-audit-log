import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Optional,
  Inject,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { AuditLogEventService } from '../services/audit-log-event.service';
import { AUDIT_LOG_EVENT_METADATA } from '../decorators/audit-log-event.decorator';
import { AuditLogGetInfoFromRequest } from '../../interfaces/audit-log-module-options.interface';
import { extractClientIp } from '../../utils/ip';

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
    @Optional()
    @Inject('GET_USERID_FUNCTION')
    private getUserIdFn?: AuditLogGetInfoFromRequest,
    @Optional()
    @Inject('GET_IPADDRESS_FUNCTION')
    private getIpAddressFn?: AuditLogGetInfoFromRequest,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const eventMetadata = this.reflector.get<EventMetadata | undefined>(
      AUDIT_LOG_EVENT_METADATA,
      context.getHandler(),
    );

    if (!eventMetadata) {
      return next.handle();
    }

    const req = context.switchToHttp().getRequest();
    const userInformation = {
      id: String(req['user']?.id || '_'),
      ip: extractClientIp(req),
    };

    if (this.getUserIdFn) {
      userInformation.id = this.getUserIdFn(req);
    }

    if (this.getIpAddressFn) {
      userInformation.ip = this.getIpAddressFn(req);
    }

    return next.handle().pipe(
      tap({
        next: (result) => {
          const description = eventMetadata.description(context, result);
          const eventDetailsData = eventMetadata.details
            ? eventMetadata.details(context, result)
            : undefined;
          this.auditLogEventService.logEvent({
            type: eventMetadata.type,
            description,
            details: eventDetailsData,
            userId: userInformation.id,
            ipAddress: userInformation.ip,
          });
        },
        error: (error) => {
          const description = eventMetadata.description(
            context,
            undefined,
            error,
          );
          const eventDetailsData = eventMetadata.details
            ? eventMetadata.details(context, undefined, error)
            : undefined;
          this.auditLogEventService.logEvent({
            type: `${eventMetadata.type}_ERROR`,
            description,
            details: eventDetailsData,
            userId: userInformation.id,
            ipAddress: userInformation.ip,
          });
        },
      }),
    );
  }
}
