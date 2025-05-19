import { DynamicModule, Module, Provider } from '@nestjs/common';
import { AuditLogModelModule } from '../audit-log-model/audit-log-model.module';
import { AuditLogRequestLoggingMiddleware } from './middlewares/audit-log-request-logging.middleware';
import { AuditLogRequestService } from './services/audit-log-request.service';

export type AuditRequestModuleOptions = {
  path: string;
  methods: Array<string>;
};

@Module({
  providers: [AuditLogRequestService],
  exports: [AuditLogRequestService],
})
export class AuditLogRequestModule {
  static forRoot(config: AuditRequestModuleOptions): DynamicModule {
    const providers: Provider[] = [
      AuditLogRequestService,
      {
        provide: 'AUTH_ROUTE',
        useValue: config,
      },
    ];

    return {
      module: AuditLogRequestModule,
      imports: [AuditLogModelModule],
      providers,
      exports: providers,
    };
  }
}
