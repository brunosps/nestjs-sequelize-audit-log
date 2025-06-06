import { ModuleRef } from '@nestjs/core';

import { AuditLogSoapClientService } from '../services/audit-log-soap-client.service';

let moduleRef: ModuleRef;
let soapClientService: AuditLogSoapClientService;

export function initializeSoapClientUtils(ref: ModuleRef): void {
  moduleRef = ref;
}

export async function createAuditSoapClient(
  wsdl: string,
  options?: any,
  endpoint?: string,
): Promise<any> {
  if (!moduleRef) {
    throw new Error(
      'SoapClientUtils não foi inicializado. Chame initializeSoapClientUtils primeiro.',
    );
  }

  if (!soapClientService) {
    soapClientService = moduleRef.get(AuditLogSoapClientService, {
      strict: false,
    });
  }

  return await soapClientService.createAsyncClient(wsdl, options, endpoint);
}

export const SoapClient = {
  createAuditSoapClient,
};
