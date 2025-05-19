// src/providers/http-logging.provider.ts
import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { AxiosHeaders } from 'axios'; // Import AxiosHeaders
import { lastValueFrom, Observable } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { AuditLogModel } from '../../audit-log-model/audit-log.model';
import { AuditLogIntegrationModel } from '../../audit-log-model/audit-log-integration.model';
import {
  HttpServiceConfig,
  HttpResponse,
  HttpError,
} from '../../config/http-service.config';

@Injectable()
export class AuditLogHttpService {
  private readonly logger = new Logger(AuditLogHttpService.name);
  private config: HttpServiceConfig = {};
  private response: HttpResponse | null = null;
  private error: HttpError | null = null;
  private startTime: number = 0;
  private logIntegration: (details: any) => void = (details) => {
    // Placeholder implementation for logIntegration
    this.logger.log(`Integration Log: ${JSON.stringify(details)}`);
    // Actual implementation would involve saving to AuditLogIntegrationModel
    // e.g., this.auditLogIntegrationModel.create(...);
  };

  constructor(
    private readonly httpService: HttpService,
    @InjectModel(AuditLogModel)
    private readonly auditLogModel: typeof AuditLogModel,
    @InjectModel(AuditLogIntegrationModel)
    private readonly auditLogIntegrationModel: typeof AuditLogIntegrationModel,
  ) {
    // Inicializa configuração vazia
  }

  // Métodos para configuração do cliente HTTP
  // ...existing code...

  // Manipulação de resposta com tipagem adequada
  private handleResponse(response: HttpResponse): any {
    try {
      const headers = (response.config?.headers || {}) as Record<string, any>;
      const startTime = parseInt(headers['X-Start-Time'] || '0', 10);
      const integrationName = headers['X-Integration-Name'] || 'unknown';

      if (startTime) {
        const duration = Date.now() - startTime;

        // Log em background, sem await
        this.logIntegration({
          method: (response.config?.method || 'GET').toUpperCase(),
          integrationName: integrationName,
          requestData: response.config?.data,
          responseData: response.data,
          status: 'SUCCESS',
          duration: duration,
        });
      }
    } catch (e) {
      this.logger.error('Error in response interceptor:', e);
    }

    return response;
  }

  // Registro de requisição usando arrow function para manter o contexto 'this'
  private logRequest = (): void => {
    this.startTime = Date.now();
    // Garantir que headers existe
    this.config.headers = this.config.headers || new AxiosHeaders();

    // Usar cabeçalhos padrão para compatibilidade máxima
    (this.config.headers as Record<string, any>)['X-Start-Time'] =
      this.startTime.toString();
    (this.config.headers as Record<string, any>)['X-Integration-Name'] =
      this.config.url || 'unknown';
  };

  // Registro de resposta usando arrow function
  private logResponse = (): void => {
    try {
      const headers = (this.config.headers || {}) as Record<string, any>;
      const startTime = parseInt(headers['X-Start-Time'] || '0', 10);
      const integrationName = headers['X-Integration-Name'] || 'unknown';

      if (startTime) {
        const duration = Date.now() - startTime;

        // Log em background, sem await
        this.logIntegration({
          method: (this.config.method || 'GET').toUpperCase(),
          integrationName: integrationName,
          requestData: this.config.data,
          responseData: this.response?.data,
          status: 'SUCCESS',
          duration: duration,
        });
      }
    } catch (e) {
      this.logger.error('Error in response interceptor:', e);
    }
  };

  // Manipulação de erro com tipagem adequada
  private handleError(error: HttpError): any {
    try {
      if (error.config) {
        const headers = (error.config.headers || {}) as Record<string, any>;
        const startTime = parseInt(headers['X-Start-Time'] || '0', 10);
        const integrationName = headers['X-Integration-Name'] || 'unknown';

        if (startTime) {
          const duration = Date.now() - startTime;

          // Log em background, sem await
          this.logIntegration({
            method: (error.config.method || 'GET').toUpperCase(),
            integrationName: integrationName,
            requestData: error.config.data,
            responseData: error.response?.data,
            status: 'ERROR',
            duration: duration,
          });
        }
      }
    } catch (e) {
      this.logger.error('Error in error interceptor:', e);
    }
    // Ensure the method returns the error or throws it
    throw error;
  }

  // Métodos públicos para fazer requisições HTTP
  // ...existing code...

  // Use lastValueFrom com tipagem correta e tratamento de erros
  async request<T = any>(config: HttpServiceConfig): Promise<T> {
    try {
      this.config = config;
      this.logRequest(); // Call logRequest to set headers
      const observable = this.httpService.request<T>(this.config) as Observable<
        HttpResponse<T>
      >;
      const response = await lastValueFrom(observable);
      this.response = response; // Store response
      this.logResponse(); // Log successful response
      return this.handleResponse(response).data;
    } catch (error) {
      this.error = error as HttpError; // Store error
      this.logError(); // Log error
      // handleError should be called to process/log the error, then rethrow
      return this.handleError(error as HttpError);
    }
  }

  // Add the missing logError method
  private logError = (): void => {
    if (!this.error) return;

    try {
      const config = this.error.config || {};
      const headers = (config.headers || {}) as Record<string, any>;
      const startTime = parseInt(headers['X-Start-Time'] || '0', 10);
      const integrationName = headers['X-Integration-Name'] || 'unknown';

      if (startTime) {
        const duration = Date.now() - startTime;
        this.logIntegration({
          method: (config.method || 'GET').toUpperCase(),
          integrationName: integrationName,
          requestData: config.data,
          responseData: this.error.response?.data,
          status: 'ERROR',
          duration: duration,
        });
      }
    } catch (e) {
      this.logger.error('Error in logError method:', e);
    }
  };
}
