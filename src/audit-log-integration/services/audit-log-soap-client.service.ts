// src/services/soap-client.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { createClientAsync, Client } from 'soap';
import { v4 as uuidv4 } from 'uuid';
import { InjectModel } from '@nestjs/sequelize';
import { AuditLogModel } from '../../audit-log-model/audit-log.model';
import { AuditLogIntegrationModel } from '../../audit-log-model/audit-log-integration.model';

@Injectable()
export class AuditLogSoapClientService {
  constructor(
    @InjectModel(AuditLogModel)
    private readonly auditLogModel: typeof AuditLogModel,
    @InjectModel(AuditLogIntegrationModel)
    private readonly auditLogIntegrationModel: typeof AuditLogIntegrationModel,
  ) {}

  async createClient(wsdl: string, integrationName: string): Promise<Client> {
    const client = await createClientAsync(wsdl);

    client.on('request', async (xml: string, method: string) => {
      const startTime = Date.now();

      client.on('response', async (responseXml: string, method: string) => {
        const duration = Date.now() - startTime;
        await this.saveLog({
          integrationName,
          method,
          requestPayload: xml,
          responsePayload: responseXml,
          status: '200',
          duration,
        });
      });

      client.on('soapError', async (error) => {
        const duration = Date.now() - startTime;
        console.error('SOAP Error:', error);
        await this.saveLog({
          integrationName,
          method,
          requestPayload: xml,
          responsePayload: error.root?.Envelope || 'SOAP Error',
          status: '500',
          duration,
        });
      });
    });

    return client;
  }

  private async saveLog({
    integrationName,
    method,
    requestPayload,
    responsePayload,
    status,
    duration,
  }: {
    integrationName: string;
    method: string;
    requestPayload: string;
    responsePayload: string;
    status: string;
    duration: number;
  }) {
    try {
      const auditLog = await (this.auditLogModel as any).create({
        id: uuidv4(),
        logType: 'INTEGRATION',
        ipAddress: 'N/A', // SOAP calls might not have a direct IP
        userId: 'system',
        createdAt: new Date(),
      } as any);

      await (this.auditLogIntegrationModel as any).create({
        id: uuidv4(),
        logId: auditLog.id,
        integrationName,
        method,
        requestPayload,
        responsePayload,
        status,
        duration,
        // createdAt will be handled by Sequelize/database
      } as any);
    } catch (error) {
      console.error('Error saving error log:', error);
    }
  }
}
