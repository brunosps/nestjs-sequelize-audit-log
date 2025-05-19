// Importação necessária para os decoradores
import 'reflect-metadata';

// Exportações de módulos
export * from './audit-log.module';
export * from './interfaces/audit-log-module-options.interface';
export * from './audit-log-model/audit-log.model';
export * from './audit-log-model/audit-log-request.model';
export * from './audit-log-model/audit-log-error.model';
export * from './audit-log-model/audit-log-event.model';
export * from './audit-log-model/audit-log-integration.model';
export * from './audit-log-model/audit-log-entity.model';

// Serviços e utilitários
export * from './services/audit-log.service';
export * from './utils/response-cache.util';
export * from './decorators/sequelize-decorators';

// Exportações adicionais conforme necessário para uso público da biblioteca
