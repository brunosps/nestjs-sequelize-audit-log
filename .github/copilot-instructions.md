# Copilot Instructions — nestjs-sequelize-audit-log

## Project Overview

A **published npm library** (`nestjs-sequelize-audit-log`) providing comprehensive audit logging for NestJS + Sequelize apps. It is **not** a standalone application — it's a dynamic NestJS module consumed via `AuditLogModule.register(options)`.

Language: TypeScript · Framework: NestJS 10 · ORM: Sequelize (sequelize-typescript) · Tests: Jest (ts-jest)

## Architecture

The root `AuditLogModule.register()` is **async** (tests archive DB connection) and conditionally composes sub-modules based on feature flags in `AuditLogModuleOptions`:

```
AuditLogModule.register(options)
├── AuditLogCoreModule     [always, @Global] — AuditLogService, PayloadDetailsService, AsyncLocalStorage context
├── AuditLogEventModule    [always]          — @AuditLogEvent() decorator, AuditLogEventService
├── AuditLogDatabaseModule [if auditedTables] — Sequelize hooks (afterCreate/Update/Destroy + bulk)
├── AuditLogRequestModule  [if enableRequestLogging] — middleware captures response body, logs REQUEST/LOGIN
├── AuditLogErrorModule    [if enableErrorLogging]    — global exception filter → ERROR logs
├── AuditLogIntegrationModule [always] — SOAP client always available; Axios interceptors + SOAP logging only if enableIntegrationLogging
└── AuditLogArchiveModule | AuditLogCleaningTask — mutually exclusive lifecycle strategies
```

**Central hub**: `AuditLogService.registerLog(logType, data)` — all 6 log types (`ENTITY`, `REQUEST`, `ERROR`, `EVENT`, `LOGIN`, `INTEGRATION`) funnel through it. It creates a parent `audit_logs` row then dispatches to the child table.

**Request context**: Uses Node.js `AsyncLocalStorage` (not NestJS REQUEST scope). `AuditLogCoreMiddleware` binds the Express request via `runWithRequest(req, next)`, making user/IP info available anywhere downstream.

## Key Conventions

### Module Pattern
Every sub-module uses `static register(config?): DynamicModule`. Options flow through **string injection tokens** (e.g., `'AUDITEDTABLES'`, `'GET_USERID_FUNCTION'`, `'AUTH_ROUTES'`, `'LOG_RETENTION_DAYS'`). Only `AuditLogModelModule` is a plain `@Module`.

### Naming
- Files: `audit-log-{domain}.{type}.ts` (e.g., `audit-log-database.service.ts`)
- Classes: `AuditLog{Domain}{Type}` (e.g., `AuditLogErrorLoggingFilter`)
- Models: `AuditLog{Domain}Model` → table `audit_logs_{domain}` (snake_case columns via `field:` option)
- DB columns: `snake_case` in schema, `camelCase` in TypeScript properties

### Middleware/Interceptor/Filter Layering
1. `AuditLogCoreMiddleware` (forRoutes `*`) — binds AsyncLocalStorage context
2. `AuditLogRequestLoggingMiddleware` (forRoutes `*`) — monkey-patches `res.write`/`res.end` to capture response
3. `RequestIdInterceptor` (global `APP_INTERCEPTOR`) — generates/propagates `X-Request-Id`
4. `AuditLogErrorLoggingFilter` (global `APP_FILTER`) — catches all exceptions, logs, re-throws

### Payload Compression
`compressPayload()` in `src/utils/compressPayload.ts` uses gzip + Base64 with a `GZ:` prefix for payloads > 1KB. Applied to INTEGRATION (`requestPayload`, `responsePayload`) and REQUEST (`payload`, `responseBody`) in `AuditLogService`. Safety net truncates at 128KB post-compression. Use `decompressPayload()` to read compressed values. Both are exported from `src/index.ts`.

### Payload Chunking (Deprecated)
`PayloadDetailsService` is deprecated — retained only for reading legacy chunked data in `audit_logs_details`. `getFullPayload()` handles both old chunked (`PayloadWithDetails`) and new compressed (`GZ:`) formats. New code should use `compressPayload()`/`decompressPayload()` directly.

### Sensitive Data
`sanitizePayload()` in `src/utils/sanitizePayload.ts` recursively redacts ~60 field names (passwords, tokens, PII) in both **Portuguese and English**. Also has `sanitizeXmlPayload()` for SOAP XML strings. When adding new sensitive fields, update the field list there.

## Developer Workflows

```bash
npm test              # Jest, serial (maxWorkers: 1), 30s timeout
npm run test:cov      # Coverage report (text + lcov + html in /coverage)
npm run build         # tsc → dist/ (NODE_OPTIONS=--no-deprecation in CI)
npm run lint:fix      # ESLint with prettier, import sorting, unused imports
npm run format        # Prettier on src/**/*.ts
```

### Publishing
Triggered by GitHub Release → `.github/workflows/npm-publish.yml` → install → test (continue-on-error) → build → `npm publish --access public`.

### Migrations
Consumer installs via `npx audit-log-install-migrations <target-dir>`. Two migration files: one creates 8 tables with FK cascades, one adds ~35 performance indexes.

## Public API Surface

Only exports in [src/index.ts](src/index.ts) are public. Key exports:
- `AuditLogModule`, `AuditLogService`, `PayloadDetailsService` (deprecated)
- `@AuditLogEvent()` decorator, `createAuditSoapClient()`, `SoapClient`
- `extractClientIp()`, `compressPayload()`, `decompressPayload()`, `AuditLogModuleOptions` type

### SOAP Integration Bridge
`SoapClientUtilsProvider` stores `ModuleRef` at init, enabling the **static** `createAuditSoapClient()` function to resolve `AuditLogSoapClientService` outside the DI container. Always use `createAuditSoapClient()` instead of `soap.createClientAsync()` to preserve audit logging.

## Database Hooks (Entity Auditing)
`AuditLogDatabaseService.setupSequelizeHooks()` registers global Sequelize hooks. For bulk operations, it uses a **snapshot-then-diff** pattern: `beforeBulkUpdate` queries current state into `options.auditBulkUpdateContext`, `afterBulkUpdate` re-queries and diffs per record. Entity keys handle composite PKs via `getModelPrimaryKeys()`.

## Archive vs Cleaning
- **Archive mode**: Cursor-based pagination copies logs to a separate DB, then deletes originals. Retains `ENTITY`/`LOGIN`/`EVENT` in archive; clears `REQUEST`/`ERROR`/`INTEGRATION` after `archiveRetentionDays`.
- **Cleaning mode** (fallback): Deletes old `ERROR`/`INTEGRATION`/`REQUEST`/`DETAILS` rows. `EVENT`/`ENTITY`/`LOGIN` are **never deleted** (intentionally commented out).

## Testing Notes
- Jest setup only imports `reflect-metadata` ([src/test/setup.ts](src/test/setup.ts))
- No test files currently exist in the repo — coverage artifacts are from prior CI runs
- When adding tests, mock `AuditLogService` and Sequelize models; use the existing `maxWorkers: 1` serial config
