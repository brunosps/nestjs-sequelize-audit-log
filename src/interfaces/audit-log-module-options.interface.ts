import { Request } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
import { ParsedQs } from 'qs';

import { AuditLogArchiveConfig } from '../audit-log-archive/audit-log-archive.module';

export type AuditLogRequestUser = {
  user: {
    id: string;
    email: string;
  };
};

export type AuditLogRequest = Request<
  ParamsDictionary,
  any,
  any,
  ParsedQs,
  Record<string, any>
> &
  AuditLogRequestUser;

export type AuditLogGetInfoFromRequest = (req: AuditLogRequest) => string;
export type AuditLogGetInfoFromAny = (req: any) => string;

export type AuditLogRequestAuthRoute = {
  path: string;
  methods: Array<string>;
  getUserId?: AuditLogGetInfoFromAny;
  registerRequest?: boolean;
  system: string;
};

export interface AuditLogModuleOptions {
  getUserId?: AuditLogGetInfoFromRequest;
  getIpAddress?: AuditLogGetInfoFromRequest;
  enableErrorLogging?: boolean;
  enableRequestLogging?: boolean;
  enableIntegrationLogging?: boolean;
  auditedTables?: Array<string>;
  authRoutes?: AuditLogRequestAuthRoute[];
  enableArchive?: false | AuditLogArchiveConfig;
}
