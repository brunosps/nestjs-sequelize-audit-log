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

export interface AuditLogSequelizeConfig {
  dialect: string;
  host: string;
  port?: number;
  database: string;
  username?: string;
  password?: string;
  pool?: { max: number; min: number; idle: number; acquire: number };
  dialectOptions?: any;
}

export interface AuditLogBufferConfig {
  bufferSize: number;
  flushIntervalMs: number;
  maxBufferSize: number;
}

export interface AuditLogModuleOptions {
  logRetentionDays: number;
  cleaningCronSchedule: string;
  getUserId?: AuditLogGetInfoFromRequest;
  getIpAddress?: AuditLogGetInfoFromRequest;
  enableErrorLogging?: boolean;
  enableRequestLogging?: boolean | AuditLogRequestAuthRoute[];
  enableIntegrationLogging?: boolean;
  auditedTables?: Array<string>;
  enableArchive?: false | AuditLogArchiveConfig;
  enableBuffer?: boolean;
  bufferConfig?: Partial<AuditLogBufferConfig>;
  auditSequelize?: AuditLogSequelizeConfig;
}
