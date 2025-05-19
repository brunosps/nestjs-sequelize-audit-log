export interface AuditLogModuleOptions {
  database: 'mysql' | 'postgres';
  host: string;
  port: number;
  username: string;
  password: string;
  databaseName: string;
  auditedTables?: string;
  enableRequestLogging?: boolean;
  enableErrorLogging?: boolean;
  enableEventLogging?: boolean;
  enableIntegrationLogging?: boolean;
  authRoute?: {
    path: string;
    methods: string[];
  };
  enableArchive?: {
    retentionPeriod: number;
    archiveDatabase: {
      dialect: 'mysql' | 'postgres';
      host: string;
      port: number;
      username: string;
      password: string;
      database: string;
      synchronize: boolean;
    };
    batchSize: number;
  };
}
