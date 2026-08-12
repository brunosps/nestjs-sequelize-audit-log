import { SetMetadata } from '@nestjs/common';

export const AUDIT_LOG_EVENT_METADATA = 'AUDIT_LOG_EVENT_METADATA';

export interface AuditLogEventOptions {
  eventType: string;
  eventDescription: string;
  getUserId: (args: any[], result: any) => string;
  getIpAddress?: (args: any[], result: any) => string;
  getDetails?: (args: any[], result: any) => Record<string, any>;
  onError?: (args: any[], error: any) => Record<string, any>;
}

export function AuditLogEvent(options: AuditLogEventOptions) {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    SetMetadata(AUDIT_LOG_EVENT_METADATA, options)(
      target,
      propertyKey,
      descriptor,
    );

    const originalMethod = descriptor.value;
    descriptor.value = async function (...args: any[]) {
      const isController =
        Reflect.getMetadata('__isController__', target.constructor) !==
        undefined;
      let userId: string;
      let ipAddress: string;
      let details: Record<string, any>;
      let eventStatus: string;
      let result: any;

      try {
        result = await originalMethod.apply(this, args);

        userId = options.getUserId(args, result);
        ipAddress = options.getIpAddress
          ? options.getIpAddress(args, result)
          : '0.0.0.0';
        details = options.getDetails
          ? options.getDetails(args, result)
          : { params: args, result: result };
        eventStatus = 'SUCCESS';
      } catch (err) {
        userId = options.getUserId(args, err);
        ipAddress = options.getIpAddress
          ? options.getIpAddress(args, err)
          : '0.0.0.0';
        details = options.onError
          ? options.onError(args, err)
          : {
              params: args,
              error:
                err instanceof Error
                  ? { message: err.message, name: err.name }
                  : err,
            };
        eventStatus = 'ERROR';
        result = err;
      }

      if (!isController) {
        try {
          const auditLogEventService = (global as any)['AUDIT_LOG_SERVICE'];
          if (auditLogEventService) {
            // O decorator descarta o protocolo, então não há motivo para
            // segurar o método decorado esperando o INSERT: quando o buffer
            // está habilitado, enfileira em vez de gravar de forma síncrona.
            await auditLogEventService.logEvent(
              {
                type: options.eventType,
                description: options.eventDescription,
                userId: userId,
                ipAddress: ipAddress,
                details: { details },
                eventStatus: eventStatus,
              },
              { sync: false },
            );
          }
        } catch (error) {
          console.error('Failed to log audit event:', error);
        }
      }

      if (result instanceof Error) {
        throw result;
      }

      return result;
    };

    return descriptor;
  };
}
