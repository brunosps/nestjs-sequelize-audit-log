# Audit Log Library for NestJS with Sequelize

This library provides a comprehensive audit logging system for NestJS applications using Sequelize as the ORM. It offers various features to log different types of events and actions within your application.

## Features

1.  Database change logging (via Triggers)
2.  HTTP request logging
3.  Error logging
4.  Integration call logging (REST and SOAP)
5.  Custom event logging
6.  Log archiving

## Installation

To use this library in your NestJS project, you need to install it along with its dependencies:

```bash
npm install @brunosps00/audit-log @nestjs/sequelize sequelize sequelize-typescript
# or
yarn add @brunosps00/audit-log @nestjs/sequelize sequelize sequelize-typescript
```

## Configuration

To set up the Audit Log system in your NestJS application, you need to import and configure the `AuditLogModule` in your `AppModule`:

```typescript
import { Module } from '@nestjs/common';
import { AuditLogModule } from '@brunosps00/audit-log'; // Corrected package name
import { SequelizeModule } from '@nestjs/sequelize'; // Your main Sequelize module

@Module({
  imports: [
    SequelizeModule.forRoot({
      // Your main database configuration
      // dialect, host, port, username, password, database, etc.
      // models: [YourAppModels...],
      // autoLoadModels: true,
      // synchronize: false, // Recommended false in production
    }),
    AuditLogModule.forRoot({
      // Tables to be audited for changes (INSERT, UPDATE, DELETE) via triggers
      // E.g.: auditedTables: ['users', 'products'],
      auditedTables: [], // Leave empty if you don't want table auditing via triggers

      // Settings for the error logging module
      enableErrorLogging: true, // Enables the global exception filter for logging errors

      // Settings for the HTTP request logging module
      enableRequestLogging: true, // Enables middleware to log all incoming requests
      // Authentication route to be logged as 'LOGIN' instead of 'REQUEST'
      authRoute: '/auth/login', // Or your application's login path

      // Settings for the integration logging module
      enableIntegrationLogging: true, // Enables interceptor for HttpService and AuditLogSoapClientService

      // Settings for the log archiving module
      enableArchive: true, // Enables the archiving task
      archiveOptions: {
        retentionPeriod: 30, // Days to keep logs before archiving (e.g., 30 days)
        archiveDatabase: { // Configuration for the archive database
          dialect: 'postgres', // or 'mysql', 'sqlite', etc.
          host: process.env.ARCHIVE_DB_HOST,
          port: parseInt(process.env.ARCHIVE_DB_PORT || '5432'),
          username: process.env.ARCHIVE_DB_USERNAME,
          password: process.env.ARCHIVE_DB_PASSWORD,
          database: process.env.ARCHIVE_DB_NAME,
          // synchronize: true, // Be careful in production, can lead to data loss. Use migrations.
          // autoLoadModels: true, // To load log models in the archive connection
        },
        batchSize: 1000, // Number of records to process per batch during archiving
        cronTime: '0 1 * * *', // Cron expression for running the archive task (e.g., daily at 1 AM)
      }
    }),
  ],
})
export class AppModule {}
```

## Database Migrations

This library includes Sequelize models for storing audit logs. To create the necessary tables in your database (and in the archive database, if configured), you will need the migrations.

You can copy the migrations provided by the library into your project by running the following command in the root of your project after installing the package:

```bash
npx audit-log-copy-migrations
```

By default, migrations will be copied to a directory named `migrations` in your project's root. If you wish to copy them to a different location, specify the path:

```bash
npx audit-log-copy-migrations ./src/database/migrations
```

After copying the migrations, you will need to configure and run them using the Sequelize CLI or your preferred migration tool. Ensure your Sequelize CLI is configured to use the directory where you copied the migrations.

**Example `.sequelizerc` configuration (if using Sequelize CLI):**
```javascript
const path = require('path');

module.exports = {
  'config': path.resolve('src', 'config', 'database.js'), // Your Sequelize config file
  'models-path': path.resolve('src', 'models'), // Your app models
  'seeders-path': path.resolve('src', 'database', 'seeders'),
  'migrations-path': path.resolve('src', 'database', 'migrations') // Where you copied the migrations
};
```

Run the migrations:
```bash
npx sequelize-cli db:migrate
```
If you are using a separate archive database, you will need to run the migrations for it as well, by pointing the Sequelize CLI to the archive database configuration.

## Usage

### Database Change Logging (Triggers)

If `auditedTables` is configured with table names, the library will attempt to create triggers on these tables to automatically capture INSERT, UPDATE, and DELETE events.
**Important:** The database user configured in Sequelize needs permissions to create triggers. This feature is most robust with databases like MySQL and PostgreSQL.

### HTTP Request Logging

HTTP request logging is automatically enabled if `enableRequestLogging` is set to `true`. All incoming HTTP requests will be logged.

### Error Logging

Error logging is automatically enabled if `enableErrorLogging` is set to `true`. It will catch and log all unhandled exceptions in your application.

### Integration Call Logging

Integration call logging is enabled if `enableIntegrationLogging` is set to `true`.
*   **REST:** Calls made using NestJS's `HttpService` (from `@nestjs/axios`, which should be injected and used in your services) are automatically intercepted and logged.
*   **SOAP:** For SOAP calls, use the provided `AuditLogSoapClientService`:

```typescript
import { Injectable } from '@nestjs/common';
import { AuditLogSoapClientService } from '@brunosps00/audit-log';

@Injectable()
export class YourService {
  constructor(private soapClientService: AuditLogSoapClientService) {}

  async callSoapService() {
    // The second argument is a name to identify this integration in the logs
    const client = await this.soapClientService.createClient('http://example.com/service.wsdl', 'MySoapIntegration');
    // Use the 'client' to make SOAP calls
    // E.g.: const result = await client.myOperationAsync({ parameter: 'value' });
  }
}
```

### Custom Event Logging

You can log custom events using the `AuditLogEvent` decorator on methods in your services:

```typescript
import { Injectable } from '@nestjs/common';
import { AuditLogEvent } from '@brunosps00/audit-log'; // Verify the correct import path

@Injectable()
export class YourService {
  @AuditLogEvent({
    eventType: 'SPECIFIC_USER_ACTION',
    // Description can be a string or a function receiving method args, result, or error
    eventDescription: (context, result, error, args) => `User ${args[0]} performed a specific action.`,
    // getDetails is optional and allows adding a JSON payload with event details
    getDetails: (context, result, error, args) => ({ 
        userId: args[0], 
        additionalParam: args[1],
        outcome: result, // The result of the performUserAction method
        errorDetails: error // The error, if the method throws an exception
    })
  })
  async performUserAction(userId: string, additionalData: any) {
    // Your logic here
    if (!userId) throw new Error('User ID is required');
    return { success: true, data: `Action for ${userId} with ${additionalData}` };
  }
}
```
The `context` provided to `eventDescription` and `getDetails` functions is the NestJS `ExecutionContext`, allowing access to the request, etc.

### Log Archiving

Log archiving is automatically handled if `enableArchive` and `archiveOptions` are configured. The task will run according to the specified `cronTime` to archive logs older than the `retentionPeriod`.

## Database Models

The library creates the following Sequelize models for storing audit logs:

*   `AuditLogModel`: Main log entry (common to all log types)
*   `AuditLogEntityModel`: Details of database entity changes (used by triggers)
*   `AuditLogRequestModel`: Details of HTTP requests
*   `AuditLogErrorModel`: Details of application errors
*   `AuditLogEventModel`: Details of custom events
*   `AuditLogIntegrationModel`: Details of integration calls (REST/SOAP)

These models will be created in your main database and, if archiving is enabled, also in the archive database.

## Considerations

*   **Performance:** Excessive logging can impact performance. Configure log levels and audited tables carefully.
*   **Security:** Sensitive information should not be logged directly. The library attempts to sanitize request payloads, but review and customize if necessary.
*   **Database Permissions:** For the trigger-based table auditing feature, the database user needs appropriate permissions (e.g., `TRIGGER`, `CREATE ROUTINE`, `ALTER ROUTINE` depending on the database and functions like `uuid_v4`).

## Conclusion

This Audit Log library provides a robust solution for logging various events in your NestJS application. By following the configuration and usage instructions, you can easily integrate it into your project and gain valuable insights into your application's behavior and user actions.
