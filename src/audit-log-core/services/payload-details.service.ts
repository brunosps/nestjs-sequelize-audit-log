import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { CreationAttributes } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';

import { AuditLogDetailModel } from '../../audit-log-model/audit-log-detail.model';
import {
  PayloadDetailsConfig,
  PayloadWithDetails,
} from '../../interfaces/payload-details.interface';
import {
  compressPayload,
  decompressPayload,
  isCompressed,
} from '../../utils/compressPayload';

/**
 * @deprecated PayloadDetailsService is deprecated. New payloads use gzip+Base64
 * compression via `compressPayload()` / `decompressPayload()` from `src/utils/compressPayload.ts`.
 * This service is retained only for backward compatibility with existing chunked data
 * in `audit_logs_details`. Use `getFullPayload()` to read legacy chunked payloads.
 */
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

  /**
   * @deprecated Use `compressPayload()` from `src/utils/compressPayload.ts` instead.
   * This method now delegates to gzip compression instead of chunking.
   */
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
      if (payload === undefined) {
        return 'Erro ao processar payload: TypeError [ERR_INVALID_ARG_TYPE]: The "string" argument must be of type string or an instance of Buffer or ArrayBuffer. Received undefined';
      }

      const payloadStr =
        typeof payload === 'string' ? payload : JSON.stringify(payload);

      return compressPayload(payloadStr);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return `Erro ao processar payload: ${errorMessage}`;
    }
  }

  /**
   * Retrieves the full payload from a stored value. Handles three formats:
   * 1. Legacy chunked payloads (`PayloadWithDetails` with `_detailsTable: true`)
   * 2. Compressed payloads (prefixed with `GZ:`)
   * 3. Plain text payloads (returned as-is)
   */
  async getFullPayload(payloadReference: string): Promise<string> {
    try {
      if (isCompressed(payloadReference)) {
        return decompressPayload(payloadReference);
      }

      const parsed = JSON.parse(payloadReference);

      if (!parsed._detailsTable) {
        return payloadReference;
      }
      return await this.reconstructFromChunks(parsed._chunkGroupId);
    } catch (error) {
      return payloadReference;
    }
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

    return chunks.map((chunk) => chunk.payloadContent).join('');
  }
}
