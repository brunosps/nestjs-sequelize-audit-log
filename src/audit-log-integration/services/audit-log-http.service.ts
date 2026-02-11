import { HttpService } from '@nestjs/axios';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { AxiosResponse, InternalAxiosRequestConfig } from 'axios';

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
  private readonly logger = new Logger(AuditLogHttpService.name);

  constructor(
    private readonly httpService: HttpService,
    @Inject(AuditLogService)
    private readonly auditLogService: AuditLogService,
    @Inject('ENABLE_INTEGRATION_LOGGING')
    private readonly enableLogging: boolean,
  ) {}

  onModuleInit() {
    if (!this.enableLogging) {
      this.logger.log('Integration HTTP logging is disabled');
      return;
    }
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
