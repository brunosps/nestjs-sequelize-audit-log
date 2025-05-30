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
import { AsyncLocalStorage } from 'async_hooks';
import { AuditLogModel } from '../../audit-log-model/audit-log.model';
import { AuditLogIntegrationModel } from '../../audit-log-model/audit-log-integration.model';
import { extractClientIp } from '../../utils/ip';
import {
  AuditLogGetInfoFromRequest,
  AuditLogRequest,
} from '../../interfaces/audit-log-module-options.interface';

type AuditLogSaveLog = {
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
  private static readonly asyncLocalStorage =
    new AsyncLocalStorage<AuditLogRequest>();

  constructor(
    private readonly httpService: HttpService,
    @InjectModel(AuditLogModel)
    private readonly auditLogModel: typeof AuditLogModel,
    @InjectModel(AuditLogIntegrationModel)
    private readonly auditLogIntegrationModel: typeof AuditLogIntegrationModel,
    @Optional()
    @Inject('GET_USERID_FUNCTION')
    private getUserIdFn?: AuditLogGetInfoFromRequest,
    @Optional()
    @Inject('GET_IPADDRESS_FUNCTION')
    private getIpAddressFn?: AuditLogGetInfoFromRequest,
  ) {}

  static runWithRequest<T>(req: AuditLogRequest, callback: () => T): T {
    return this.asyncLocalStorage.run(req, callback);
  }

  private getCurrentRequest(): AuditLogRequest | undefined {
    return AuditLogHttpService.asyncLocalStorage.getStore();
  }

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

  private async saveLog({
    integrationName,
    method,
    requestPayload,
    responsePayload,
    status,
    duration,
  }: AuditLogSaveLog) {
    try {
      console.log({
        integrationName,
        method,
        requestPayload,
        responsePayload,
        status,
        duration,
      });
      const req = this.getCurrentRequest();

      const userInformation = {
        id: 'system',
        ip: '0.0.0.0',
      };

      if (req) {
        userInformation.id = String(req['user']?.id || 'system');
        userInformation.ip = extractClientIp(req);

        if (this.getUserIdFn) {
          userInformation.id = this.getUserIdFn(req);
        }

        if (this.getIpAddressFn) {
          userInformation.ip = this.getIpAddressFn(req);
        }
      }

      const auditLog = await this.auditLogModel.create({
        id: uuidv4(),
        logType: 'INTEGRATION',
        ipAddress: userInformation.ip,
        userId: userInformation.id,
        createdAt: new Date(),
      } as CreationAttributes<AuditLogModel>);

      await this.auditLogIntegrationModel.create({
        id: uuidv4(),
        logId: auditLog.id,
        integrationName,
        method,
        requestPayload,
        responsePayload,
        status,
        duration,
      } as CreationAttributes<AuditLogIntegrationModel>);
    } catch (error) {
      console.error('Error saving integration log:', error);
    }
  }
}
