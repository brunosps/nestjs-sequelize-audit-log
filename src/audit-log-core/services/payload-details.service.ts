import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { CreationAttributes } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';

import { AuditLogDetailModel } from '../../audit-log-model/audit-log-detail.model';
import {
  PayloadDetailsConfig,
  PayloadWithDetails,
} from '../../interfaces/payload-details.interface';

@Injectable()
export class PayloadDetailsService {
  private static config: PayloadDetailsConfig = {
    detailsTableThreshold: 65535,
    maxChunkSize: 65535,
    previewSize: 1000,
  };

  constructor(
    @InjectModel(AuditLogDetailModel)
    private readonly auditLogDetailModel: typeof AuditLogDetailModel,
  ) {}

  async processPayload(
    chunkGroupId: string,
    payload: any,
    type: 'request' | 'response' | 'entity' | 'event' | 'error',
    logType: string,
    context: {
      logId: string;
      integrationName?: string;
      method?: string;
      entity?: string;
      action?: string;
      userId?: string;
    },
  ): Promise<string> {
    try {
      const payloadStr =
        typeof payload === 'string' ? payload : JSON.stringify(payload);
      const originalSize = Buffer.byteLength(payloadStr, 'utf8');

      if (originalSize <= PayloadDetailsService.config.detailsTableThreshold!) {
        return payloadStr;
      }

      const result = await this.storeInDetailsTable(
        chunkGroupId,
        payloadStr,
        type,
        logType,
        originalSize,
        context,
      );

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return `Error processing payload: ${errorMessage}`;
    }
  }

  private async storeInDetailsTable(
    chunkGroupId: string,
    payloadStr: string,
    type: string,
    logType: string,
    originalSize: number,
    context: any,
  ): Promise<string> {
    try {
      const contentToStore = payloadStr;
      const result = await this.storeInChunks(
        chunkGroupId,
        contentToStore,
        type,
        logType,
        originalSize,
        context,
      );
      return result;
    } catch (error) {
      const truncated = `${payloadStr.substring(0, PayloadDetailsService.config.previewSize!)} \n... [PAYLOAD TRUNCATED - DETAILS TABLE ERROR] \n ${error}`;
      return truncated;
    }
  }

  private async storeInChunks(
    chunkGroupId: string,
    content: string,
    type: string,
    logType: string,
    originalSize: number,
    context: any,
  ): Promise<string> {
    const maxChunkSize = PayloadDetailsService.config.maxChunkSize!;
    const chunks: string[] = [];

    for (let i = 0; i < content.length; i += maxChunkSize) {
      chunks.push(content.substring(i, i + maxChunkSize));
    }

    const chunkPromises = chunks.map(async (chunk, index) => {
      const chunkId = uuidv4();
      const sequence = index + 1;
      const savedChunk = await this.auditLogDetailModel.create({
        id: chunkId,
        logId: context.logId,
        payloadType: type,
        logType: logType,
        chunkGroupId: chunkGroupId,
        chunkSequence: sequence,
        totalChunks: chunks.length,
        originalSize: originalSize,
        payloadContent: chunk,
        userId: context.userId,
      } as CreationAttributes<AuditLogDetailModel>);
      return savedChunk;
    });

    await Promise.all(chunkPromises);

    const detailsReference: PayloadWithDetails = {
      _detailsTable: true,
      _chunkGroupId: chunkGroupId,
      _totalChunks: chunks.length,
      _originalSize: originalSize,
      _timestamp: new Date().toISOString(),
      _type: type,
      _preview: content.substring(0, PayloadDetailsService.config.previewSize!),
      _context: {
        logType,
        integrationName: context.integrationName,
        method: context.method,
        userId: context.userId,
      },
    };

    return JSON.stringify(detailsReference);
  }

  async getFullPayload(payloadReference: string): Promise<string> {
    const parsed = JSON.parse(payloadReference);

    if (!parsed._detailsTable) {
      return payloadReference;
    }
    return await this.reconstructFromChunks(parsed._chunkGroupId);
  }

  private async reconstructFromChunks(chunkGroupId: string): Promise<string> {
    const chunks = await this.auditLogDetailModel.findAll({
      where: { chunkGroupId },
      order: [['chunkSequence', 'ASC']],
    });

    for (let i = 0; i < chunks.length; i++) {
      if (chunks[i].chunkSequence !== i + 1) {
        throw new Error(`Missing chunk ${i + 1} in group ${chunkGroupId}`);
      }
    }

    let reconstructedContent = '';
    for (const chunk of chunks) {
      reconstructedContent += chunk.payloadContent;
    }

    return chunks.map((chunk) => chunk.payloadContent).join('');
  }
}
