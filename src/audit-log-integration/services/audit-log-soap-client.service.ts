import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Client, createClientAsync } from 'soap';
import { v4 as uuidv4 } from 'uuid';

import { AuditLogModel } from '../../audit-log-model/audit-log.model';
import { AuditLogIntegrationModel } from '../../audit-log-model/audit-log-integration.model';

@Injectable()
export class AuditLogSoapClientService {
  private readonly logger = new Logger(AuditLogSoapClientService.name);

  constructor(
    @InjectModel(AuditLogModel)
    private readonly auditLogModel: typeof AuditLogModel,
    @InjectModel(AuditLogIntegrationModel)
    private readonly auditLogIntegrationModel: typeof AuditLogIntegrationModel,
  ) {}

  async createClient(wsdl: string, integrationName: string): Promise<Client> {
    const client = await createClientAsync(wsdl);
    let startTime: number;
    let requestXml: string;

    client.on('request', (xml: string, eid: string) => {
      startTime = Date.now();
      requestXml = xml;
      this.logger.debug(`SOAP Request [${eid}] to ${integrationName}: ${xml}`);
    });

    client.on('response', (responseXml: string, eid: string) => {
      const duration = Date.now() - startTime;
      this.logger.debug(
        `SOAP Response [${eid}] from ${integrationName}: ${responseXml}`,
      );
      this.saveLog({
        integrationName,
        method: 'SOAP_CALL',
        requestPayload: requestXml,
        responsePayload: responseXml,
        status: '200',
        duration,
      }).catch((err) =>
        this.logger.error('Failed to save SOAP success log', err),
      );
    });

    client.on('soapError', (error: any, eid: string) => {
      const duration = Date.now() - startTime;
      const errorPayload =
        error.root?.Envelope || error.message || 'SOAP Error';
      this.logger.error(
        `SOAP Error [${eid}] from ${integrationName}: ${JSON.stringify(errorPayload)}`,
      );
      this.saveLog({
        integrationName,
        method: 'SOAP_CALL',
        requestPayload: requestXml,
        responsePayload: JSON.stringify(errorPayload),
        status: '500',
        duration,
      }).catch((err) =>
        this.logger.error('Failed to save SOAP error log', err),
      );
    });

    return client;
  }

  private async saveLog(data: {
    integrationName: string;
    method: string;
    requestPayload: string;
    responsePayload: string;
    status: string;
    duration: number;
  }) {
    try {
      const auditLog = await this.auditLogModel.create({
        id: uuidv4(),
        logType: 'INTEGRATION',
        ipAddress: 'N/A',
        userId: 'system',
        createdAt: new Date(),
      } as any);

      await this.auditLogIntegrationModel.create({
        id: uuidv4(),
        logId: auditLog.id,
        integrationName: data.integrationName,
        method: data.method,
        requestPayload: data.requestPayload,
        responsePayload: data.responsePayload,
        status: data.status,
        duration: data.duration,
      } as any);
    } catch (error: any) {
      this.logger.error(
        'Error saving integration log:',
        error.message,
        error.stack,
      );
    }
  }
}
