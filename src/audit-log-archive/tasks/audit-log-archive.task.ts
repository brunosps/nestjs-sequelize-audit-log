import { Inject, Injectable, Logger } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';

import { AuditLogArchiveService } from '../services/audit-log-archive.service';

@Injectable()
export class AuditLogArchiveTask {
  private readonly logger = new Logger(AuditLogArchiveTask.name);

  onModuleInit() {
    const job = new CronJob(
      this.archiveCronSchedule,
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
    private readonly archiveService: AuditLogArchiveService,
    @Inject('ARCHIVE_CRON_SCHEDULE')
    private readonly archiveCronSchedule: string,
  ) {}

  handleArchiving = async () => {
    this.logger.log('Starting scheduled audit log archiving...');
    await this.archiveService.execute();
    this.logger.log('Scheduled audit log archiving completed.');
  };
}
