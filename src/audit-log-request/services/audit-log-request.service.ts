import { Injectable } from '@nestjs/common';
import { RequestIdInterceptor } from '../interceptors/request-id.interceptor';

@Injectable()
export class AuditLogRequestService {
  constructor() {}

  async getRequestId() {
    const context = RequestIdInterceptor.getContext();
    return context?.requestId;
  }
}
