# AuditLog Module

A comprehensive audit logging module for NestJS applications that provides detailed tracking of database operations, HTTP requests, errors, and system integrations.

## Features

- 🔍 **Database Table Auditing**: Automatic tracking of CRUD operations on specified tables
- 📝 **Request Logging**: HTTP request/response logging with user identification
- ❌ **Error Logging**: Comprehensive error tracking and reporting
- 🔗 **Integration Logging**: External API and service integration monitoring
- 🧼 **Audited SOAP Client**: Built-in SOAP client with full automatic audit logging
- 👤 **Authentication Route Tracking**: Special handling for authentication endpoints
- 📦 **Archive Support**: Configurable data archiving for long-term storage
- 🌐 **IP Address Tracking**: Client IP address logging
- 🗃️ **Payload Compression**: Automatic gzip + Base64 compression of large payloads
- 🔧 **Flexible Configuration**: Extensive customization options

## Installation

```bash
npm install @your-org/audit-log
```

### Installing Migrations

After installing the package, copy the migrations to your project:

```bash
npx audit-log-install-migrations migrations
```

Or specify a custom directory:

```bash
npx audit-log-install-migrations database/migrations
npx audit-log-install-migrations src/migrations
```

This command will:
- Copy all necessary migrations to the specified directory
- Automatically add timestamps to migration filenames
- Ensure no conflicts with existing migrations

#### Available Migrations

| Migration | Description |
|---|---|
| `audit-log-migrations.js` | Creates the 8 main tables with FK cascades |
| `audit-log-performance-indexes.js` | ~35 performance indexes |
| `audit-log-event-status.js` | Adds `event_status` column to the `audit_logs_event` table |

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

#### 5. Event Logging

Event logging is enabled by default and can be used in two ways.

Each event automatically records an `eventStatus` (`SUCCESS` or `ERROR`) based on the method execution result.

**Using the @AuditLogEvent Decorator:**

```typescript
import { AuditLogEvent } from 'nestjs-sequelize-audit-log';

@AuditLogEvent({
  eventType: "UPDATE_USER_PASSWORD",
  eventDescription: "User password update",
  getUserId: (args, result) => args[0].userId,
  getDetails: (args, result) => ({
    userId: args[0].userId,
    success: result.success
  }),
  onError: (args, error) => ({
    userId: args[0].userId,
    errorMessage: error.message,
  }),
})
async updatePassword(input: UpdatePasswordInput): Promise<UpdatePasswordOutput> {
  return await this.passwordService.update(input);
}
```

**Decorator Options:**

| Option | Type | Required | Description |
|---|---|---|---|
| `eventType` | `string` | Yes | Event type identifier |
| `eventDescription` | `string` | Yes | Event description |
| `getUserId` | `(args, result) => string` | Yes | Extracts the user ID |
| `getIpAddress` | `(args, result) => string` | No | Extracts the IP address (default: `'0.0.0.0'`) |
| `getDetails` | `(args, result) => Record<string, any>` | No | Event details on **success** |
| `onError` | `(args, error) => Record<string, any>` | No | Event details on **error**. If not provided, logs `{ params, error: { message, name } }` |

**Using Direct Service Injection:**

```typescript
import { AuditLogService } from 'nestjs-sequelize-audit-log';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly auditLogService: AuditLogService,
  ) {}

  async validateUser(input: ValidateUserInput): Promise<boolean> {
    const user = await this.userRepository.findByEmail(input.email);

    this.auditLogService.logEvent({
      type: 'USER_VALIDATION',
      description: 'User credential validation',
      details: {
        email: input.email,
        success: !!user
      },
      eventStatus: user ? 'SUCCESS' : 'ERROR',
    });

    if (!user) {
      throw new Error('User not found');
    }

    return true;
  }
}
```

#### 6. Authentication Routes

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

#### 7. Archive Configuration

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

## Payload Compression Utilities

The library automatically compresses large payloads (> 1 KB) using gzip + Base64 to reduce database storage usage. Utilities are available for manual compression and decompression:

```typescript
import { compressPayload, decompressPayload, isCompressed } from 'nestjs-sequelize-audit-log';

// Compresses if the value exceeds the threshold (default: 1024 bytes)
const compressed = compressPayload(largeJsonString);
// Result: 'GZ:H4sIAAAAAAAAA...' (GZ: prefix indicates a compressed value)

// Check if a value is compressed
if (isCompressed(compressed)) {
  const original = decompressPayload(compressed);
}
```

Compression is automatically applied to the following fields:
- **Integration Log**: `requestPayload`, `responsePayload`
- **Request Log**: `payload`, `responseBody`

## SOAP Client with Automatic Auditing

The library includes a built-in SOAP client that automatically logs all SOAP calls and responses for comprehensive auditing.

### Using createAuditSoapClient

**⚠️ IMPORTANT**: Always use `createAuditSoapClient` to create SOAP clients. This is the only recommended function to ensure full automatic audit logging.

```typescript
import { createAuditSoapClient } from 'nestjs-sequelize-audit-log';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ExternalSystemService {
  private readonly logger = new Logger(ExternalSystemService.name);

  async getClient(): Promise<any> {
    const client = await createAuditSoapClient(
      process.env.EXTERNAL_WSDL_URL!,
      { wsdl_options: { timeout: 60000 } },
      process.env.EXTERNAL_ENDPOINT
    );

    // Configure authentication if needed
    if (process.env.EXTERNAL_USER && process.env.EXTERNAL_PASSWORD) {
      const { BasicAuthSecurity } = await import('soap');
      client.setSecurity(new BasicAuthSecurity(
        process.env.EXTERNAL_USER,
        process.env.EXTERNAL_PASSWORD
      ));
    }

    return client;
  }

  async executeOperation(data: any) {
    const client = await this.getClient();
    // All calls are automatically audited
    return await client.MyOperationAsync(data);
  }
}
```

### SOAP Client Features

- **Automatic Auditing**: Full logging of SOAP requests, responses, errors, and duration
- **Smart Extraction**: Automatic detection of SOAP method names and integration names from WSDL URLs
- **Always use `createAuditSoapClient`** instead of `soap.createClientAsync()` to preserve audit logging

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
