import { Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { createClientAsync } from 'soap';

import { AuditLogSoapClientService } from '../services/audit-log-soap-client.service';

const logger = new Logger('SoapClientUtils');

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
    logger.warn(
      'SoapClientUtils não foi inicializado pelo módulo. Criando client SOAP sem audit logging.',
    );
    return createClientAsync(wsdl, options, endpoint);
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
