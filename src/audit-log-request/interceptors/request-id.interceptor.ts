import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import { Observable } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

interface RequestContext {
  requestId: string;
}

@Injectable()
export class RequestIdInterceptor implements NestInterceptor {
  private static asyncLocalStorage = new AsyncLocalStorage<RequestContext>();

  static getContext(): RequestContext | undefined {
    return RequestIdInterceptor.asyncLocalStorage.getStore();
  }

  static getRequestId(): string | undefined {
    return RequestIdInterceptor.getContext()?.requestId;
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const requestId = request.headers['x-request-id'] || uuidv4();
    const requestContext: RequestContext = {
      requestId,
    };

    const response = context.switchToHttp().getResponse();
    if (response) {
      response.setHeader('X-Request-Id', requestId);
    }

    return new Observable((subscriber) => {
      RequestIdInterceptor.asyncLocalStorage.run(requestContext, () => {
        next.handle().subscribe(subscriber);
      });
    });
  }
}
