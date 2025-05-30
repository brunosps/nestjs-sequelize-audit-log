import {
  Injectable,
  OnModuleInit,
  Logger,
  Optional,
  Inject,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import {
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';
import { InjectModel } from '@nestjs/sequelize';
import { v4 as uuidv4 } from 'uuid';
import { CreationAttributes } from 'sequelize';
import { AuditLogModel } from '../../audit-log-model/audit-log.model';
import { AuditLogIntegrationModel } from '../../audit-log-model/audit-log-integration.model';
import { AuditLogService } from '../../audit-log-core/services/audit-log.service';

export type AuditLogHttpIntegrationType = {
  integrationName: string;
  method: string;
  requestPayload: string;
  responsePayload: string;
  status: string;
  duration: number;
};
interface AxiosRequestConfigWithMetadata extends InternalAxiosRequestConfig {
  metadata?: { startTime: number };
}

@Injectable()
export class AuditLogHttpService implements OnModuleInit {
  constructor(
    private readonly httpService: HttpService,
    @Inject(AuditLogService)
    private readonly auditLogService: AuditLogService,
  ) {}

  onModuleInit() {
    const axiosInstance = this.httpService.axiosRef;

    axiosInstance.interceptors.request.use(
      async (config: InternalAxiosRequestConfig) => {
        (config as AxiosRequestConfigWithMetadata).metadata = {
          startTime: Date.now(),
        };
        return config;
      },
    );

    axiosInstance.interceptors.response.use(
      async (response: AxiosResponse) => {
        const { config } = response;

        const duration =
          Date.now() -
          ((config as AxiosRequestConfigWithMetadata).metadata?.startTime ||
            Date.now());

        await this.saveLog({
          integrationName: config.url ?? 'unknown',
          method: config.method?.toUpperCase() ?? 'UNKNOWN',
          requestPayload: JSON.stringify(config.data || {}),
          responsePayload: JSON.stringify(response.data || {}),
          status: response.status.toString(),
          duration,
        });

        return response;
      },
      async (error) => {
        const config = error.config as
          | AxiosRequestConfigWithMetadata
          | undefined;

        const duration =
          Date.now() - (config?.metadata?.startTime || Date.now());
        await this.saveLog({
          integrationName: config?.url ?? 'unknown',
          method: config?.method?.toUpperCase() ?? 'UNKNOWN',
          requestPayload: JSON.stringify(config?.data || {}),
          responsePayload: JSON.stringify(error.response?.data || {}),
          status: error.response?.status?.toString() ?? 'ERROR',
          duration,
        });

        throw error;
      },
    );
  }

  private async saveLog(data: AuditLogHttpIntegrationType) {
    try {
      this.auditLogService.registerLog('INTEGRATION', data);
    } catch (error) {
      console.error('Error saving integration log:', error);
    }
  }
}
