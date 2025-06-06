import { Inject, Injectable, Logger } from '@nestjs/common';
import { Client, createClientAsync, IOptions } from 'soap';

import { AuditLogService } from '../../audit-log-core';

export type AuditLogSoapIntegrationType = {
  integrationName: string;
  method: string;
  requestPayload: string;
  responsePayload: string;
  status: string;
  duration: number;
};

@Injectable()
export class AuditLogSoapClientService {
  private readonly logger = new Logger(AuditLogSoapClientService.name);

  constructor(
    @Inject(AuditLogService)
    private readonly auditLogService: AuditLogService,
  ) {}

  async createAsyncClient(
    wsdl: string,
    options?: IOptions,
    endpoint?: string,
  ): Promise<Client> {
    const client = await createClientAsync(wsdl, options, endpoint);
    return this.setupClientLogging(client, wsdl);
  }

  public setupClientLogging(
    client: Client,
    wsdl?: string,
    endpoint?: string,
  ): Client {
    let startTime: number;
    let requestXml: string;
    let soapMethod: string = 'SOAP_CALL';

    const integrationName = wsdl || endpoint;

    client.on('request', (xml: string, eid: string) => {
      startTime = Date.now();
      requestXml = xml;
      soapMethod = this.extractSoapMethod(xml);
    });

    client.on('response', (responseXml: string, eid: string) => {
      const duration = Date.now() - startTime;

      this.saveLog({
        integrationName,
        method: soapMethod,
        requestPayload: requestXml,
        responsePayload: responseXml,
        status: '200',
        duration,
      }).catch((err) => console.log('Failed to save SOAP success log', err));
    });

    client.on('soapError', (error: any, eid: string) => {
      const duration = Date.now() - startTime;
      const errorPayload =
        error.root?.Envelope || error.message || 'SOAP Error';

      const finalIntegrationName = this.buildIntegrationName(
        integrationName,
        wsdl,
        endpoint,
        soapMethod,
      );

      this.saveLog({
        integrationName: finalIntegrationName,
        method: soapMethod,
        requestPayload: requestXml,
        responsePayload: JSON.stringify(errorPayload),
        status: '500',
        duration,
      }).catch((err) => console.log('Failed to save SOAP error log', err));
    });

    return client;
  }

  private async saveLog(data: AuditLogSoapIntegrationType) {
    try {
      this.auditLogService.registerLog('INTEGRATION', data);
    } catch (error) {
      console.error('Error saving integration log:', error);
    }
  }

  private extractSoapMethod(xml: string): string {
    try {
      const bodyContentMatch = xml.match(
        /<(?:soap:)?Body[^>]*>([\s\S]*?)<\/(?:soap:)?Body>/i,
      );

      if (bodyContentMatch) {
        const bodyContent = bodyContentMatch[1].trim();

        const elementMatch = bodyContent.match(
          /<(?:[^:>\s]+:)?([^:\s/>]+)[^>]*>/i,
        );

        if (elementMatch && elementMatch[1]) {
          const methodName = elementMatch[1].trim();

          const excludedElements = [
            'Envelope',
            'Body',
            'Header',
            'soap',
            'SOAP',
          ];

          if (!excludedElements.includes(methodName) && methodName.length > 0) {
            return methodName;
          }
        }

        const allMatches = bodyContent.match(
          /<(?:[^:>\s]+:)?([^:\s/>]+)[^>]*>/gi,
        );
        if (allMatches) {
          for (const match of allMatches) {
            const elementNameMatch = match.match(/<(?:[^:>\s]+:)?([^:\s/>]+)/i);
            if (elementNameMatch && elementNameMatch[1]) {
              const elementName = elementNameMatch[1].trim();
              const excludedElements = [
                'Envelope',
                'Body',
                'Header',
                'soap',
                'SOAP',
              ];

              if (
                !excludedElements.includes(elementName) &&
                elementName.length > 1
              ) {
                return elementName;
              }
            }
          }
        }
      }

      return 'SOAP_CALL';
    } catch (error) {
      console.warn('Erro ao extrair método SOAP do XML:', error);
      return 'SOAP_CALL';
    }
  }

  private buildIntegrationName(
    integrationName: string,
    wsdl?: string,
    endpoint?: string,
    soapMethod?: string,
  ): string {
    let finalName = integrationName;

    if (endpoint) {
      finalName = `${finalName}[${endpoint}]`;
    } else if (wsdl) {
      finalName = `${finalName}[${wsdl}]`;
    }

    if (soapMethod && soapMethod !== 'SOAP_CALL') {
      finalName = `${finalName}.${soapMethod}`;
    }

    return finalName;
  }
}
