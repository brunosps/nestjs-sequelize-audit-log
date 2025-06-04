# AuditLog Module

A comprehensive audit logging module for NestJS applications that provides detailed tracking of database operations, HTTP requests, errors, and system integrations.

## Features

- 🔍 **Database Table Auditing**: Automatic tracking of CRUD operations on specified tables
- 📝 **Request Logging**: HTTP request/response logging with user identification
- ❌ **Error Logging**: Comprehensive error tracking and reporting
- 🔗 **Integration Logging**: External API and service integration monitoring
- 👤 **Authentication Route Tracking**: Special handling for authentication endpoints
- 📦 **Archive Support**: Configurable data archiving for long-term storage
- 🌐 **IP Address Tracking**: Client IP address logging
- 🔧 **Flexible Configuration**: Extensive customization options

## Installation

```bash
npm install @your-org/audit-log
```

## Quick Start

```typescript
import { Module } from '@nestjs/common';
import { AuditLogModule } from '@your-org/audit-log';

@Module({
  imports: [
    AuditLogModule.forRoot({
      enableRequestLogging: true,
      enableErrorLogging: true,
      enableIntegrationLogging: true,
      auditedTables: ['users', 'orders', 'products'],
      getUserId: (req) => req.user?.id,
      getIpAddress: (req) => req.ip || req.connection.remoteAddress,
    }),
  ],
})
export class AppModule {}
```

## Configuration Options

### AuditLogModuleOptions

The main configuration interface provides the following options:

```typescript
interface AuditLogModuleOptions {
  // User identification
  getUserId?: (req: AuditLogRequest) => string;
  
  // IP address extraction
  getIpAddress?: (req: AuditLogRequest) => string;
  
  // Feature toggles
  enableErrorLogging?: boolean;
  enableRequestLogging?: boolean;
  enableIntegrationLogging?: boolean;
  
  // Database auditing
  auditedTables?: Array<string>;
  
  // Authentication routes
  authRoutes?: AuditLogRequestAuthRoute[];
  
  // Archive configuration
  enableArchive?: false | AuditLogArchiveConfig;
}
```

### Feature Configuration

#### 1. Request Logging

Enable HTTP request/response logging:

```typescript
AuditLogModule.forRoot({
  enableRequestLogging: true,
  getUserId: (req) => req.user?.id,
  getIpAddress: (req) => req.headers['x-forwarded-for'] || req.ip,
});
```

#### 2. Error Logging

Track application errors:

```typescript
AuditLogModule.forRoot({
  enableErrorLogging: true,
  getUserId: (req) => req.user?.id,
});
```

#### 3. Integration Logging

Monitor external API calls and integrations:

```typescript
AuditLogModule.forRoot({
  enableIntegrationLogging: true,
});
```

#### 4. Database Table Auditing

Automatically track changes to specified database tables:

```typescript
AuditLogModule.forRoot({
  auditedTables: [
    'users',
    'orders',
    'products',
    'transactions',
  ],
});
```

#### 5. Authentication Routes

Special handling for authentication endpoints:

```typescript
AuditLogModule.forRoot({
  authRoutes: [
    {
      path: '/auth/login',
      methods: ['POST'],
      getUserId: (req) => req.body?.email,
      registerRequest: true,
      system: 'authentication',
    },
    {
      path: '/auth/logout',
      methods: ['POST'],
      system: 'authentication',
    },
  ],
});
```

#### 6. Archive Configuration

Configure data archiving for long-term storage in a separate database:

```typescript
AuditLogModule.forRoot({
  enableArchive: {
    retentionPeriod: 365, // days
    batchSize: 1000,
    archiveCronSchedule: '0 2 * * *', // Daily at 2 AM
    archiveDatabase: {
      dialect: 'postgres',
      host: 'archive-db-host',
      port: 5432,
      username: 'archive_user',
      password: 'archive_password',
      database: 'audit_archive',
    },
  },
});
```

## Advanced Usage

### Custom User Identification

Implement custom logic for extracting user information:

```typescript
AuditLogModule.forRoot({
  getUserId: (req) => {
    // JWT token extraction
    if (req.headers.authorization) {
      const token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.decode(token);
      return decoded?.sub;
    }
    
    // Session-based extraction
    if (req.session?.user) {
      return req.session.user.id;
    }
    
    return 'anonymous';
  },
});
```

### Custom IP Address Extraction

Handle various proxy configurations:

```typescript
AuditLogModule.forRoot({
  getIpAddress: (req) => {
    return (
      req.headers['cf-connecting-ip'] ||
      req.headers['x-real-ip'] ||
      req.headers['x-forwarded-for']?.split(',')[0] ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      'unknown'
    );
  },
});
```

### Authentication Route Configuration

Configure different authentication endpoints:

```typescript
const authRoutes: AuditLogRequestAuthRoute[] = [
  {
    path: '/api/auth/login',
    methods: ['POST'],
    getUserId: (req) => req.body?.username || req.body?.email,
    registerRequest: true,
    system: 'web-auth',
  },
  {
    path: '/api/auth/refresh',
    methods: ['POST'],
    getUserId: (req) => req.body?.refreshToken,
    registerRequest: false,
    system: 'token-refresh',
  },
  {
    path: '/api/auth/password-reset',
    methods: ['POST'],
    getUserId: (req) => req.body?.email,
    registerRequest: true,
    system: 'password-reset',
  },
];
```

## Type Definitions

### AuditLogRequest

Extended Express request with user information:

```typescript
type AuditLogRequest = Request & {
  user: {
    id: string;
    email: string;
  };
};
```

### AuditLogRequestAuthRoute

Configuration for authentication routes:

```typescript
type AuditLogRequestAuthRoute = {
  path: string;
  methods: Array<string>;
  getUserId?: (req: any) => string;
  registerRequest?: boolean;
  system: string;
};
```

## Archive Configuration

### AuditLogArchiveConfig

Configure data archiving settings for moving old audit logs to a separate database:

```typescript
interface AuditLogArchiveConfig {
  retentionPeriod: number; // Number of days to keep logs in main database
  archiveDatabase: SequelizeModuleOptions; // Separate database configuration
  batchSize?: number; // Number of records to process per batch
  archiveCronSchedule: string; // Cron expression for archive schedule
}
```

### Archive Database Models

The archive system creates mirrored models for all audit log types:
- `ArchiveLogModel` - Main audit logs
- `ArchiveLogEntityModel` - Entity change logs
- `ArchiveLogErrorModel` - Error logs
- `ArchiveLogEventModel` - Event logs
- `ArchiveLogIntegrationModel` - Integration logs
- `ArchiveLogRequestModel` - Request logs
- `ArchiveLogLoginModel` - Login logs
- `ArchiveLogDetailModel` - Detailed audit information

## Best Practices

### 1. Security Considerations

- Never log sensitive information like passwords or tokens
- Implement proper data retention policies
- Use secure storage for archived logs
- Sanitize user input in log messages

### 2. Performance Optimization

- Use async logging to avoid blocking operations
- Configure appropriate batch sizes for archive operations
- Use separate databases for audit logs and archives
- Monitor database storage usage and performance
- Set appropriate retention periods to manage main database size

### 3. Compliance

- Ensure GDPR compliance for user data logging
- Implement proper data anonymization
- Set appropriate retention periods
- Provide audit trail export capabilities

## Examples

### Basic Setup

```typescript
@Module({
  imports: [
    AuditLogModule.forRoot({
      enableRequestLogging: true,
      enableErrorLogging: true,
      auditedTables: ['users', 'orders'],
      getUserId: (req) => req.user?.id,
    }),
  ],
})
export class AppModule {}
```

### Production Configuration

```typescript
@Module({
  imports: [
    AuditLogModule.forRoot({
      enableRequestLogging: true,
      enableErrorLogging: true,
      enableIntegrationLogging: true,
      auditedTables: [
        'users', 'orders', 'products', 'transactions',
        'invoices', 'payments', 'shipping',
      ],
      getUserId: (req) => extractUserFromJWT(req),
      getIpAddress: (req) => extractRealIP(req),
      authRoutes: [
        {
          path: '/auth/login',
          methods: ['POST'],
          getUserId: (req) => req.body?.email,
          registerRequest: true,
          system: 'authentication',
        },
      ],
      enableArchive: {
        retentionPeriod: 2555, // 7 years
        batchSize: 5000,
        archiveCronSchedule: '0 2 * * *', // Daily at 2 AM
        archiveDatabase: {
          dialect: 'postgres',
          host: 'archive-db-host',
          port: 5432,
          username: 'archive_user',
          password: 'archive_password',
          database: 'company_audit_archive',
        },
      },
    }),
  ],
})
export class AppModule {}
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions, please visit our [GitHub repository](https://github.com/your-org/audit-log) or contact the development team.
