import { Inject, Injectable, Logger } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';

import { AuditLogService } from '../audit-log-core';

@Injectable()
export class AuditLogCleaningTask {
  private readonly logger = new Logger(AuditLogCleaningTask.name);

  onModuleInit() {
    const job = new CronJob(
      this.cleaningCronSchedule,
      this.handleArchiving,
      null,
      true,
      'America/Sao_Paulo',
    );
    this.schedulerRegistry.addCronJob('AuditLogArchiveTask', job);
    job.start();
  }

  constructor(
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly auditLogService: AuditLogService,
    @Inject('CLEANING_CRON_SCHEDULE')
    private readonly cleaningCronSchedule: string,
  ) {}

  handleArchiving = async () => {
    this.logger.log('Starting scheduled audit log archiving...');
    await this.auditLogService.clearLogs();
    this.logger.log('Scheduled audit log archiving completed.');
  };
}
