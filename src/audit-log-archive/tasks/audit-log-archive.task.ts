import { Inject, Injectable, Logger } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';

import { AuditLogArchiveService } from '../services/audit-log-archive.service';

const ARCHIVE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

@Injectable()
export class AuditLogArchiveTask {
  private readonly logger = new Logger(AuditLogArchiveTask.name);
  private isRunning = false;

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
    if (this.isRunning) {
      this.logger.warn(
        'Archive task already running — skipping this execution',
      );
      return;
    }

    this.isRunning = true;
    this.logger.log('Starting scheduled audit log archiving...');

    const work = this.archiveService.execute();

    try {
      await Promise.race([
        work,
        new Promise<void>((_, reject) =>
          setTimeout(
            () => reject(new Error('Archive timeout exceeded')),
            ARCHIVE_TIMEOUT_MS,
          ),
        ),
      ]);
      this.logger.log('Scheduled audit log archiving completed.');
    } catch (error) {
      this.logger.error('Archive task error:', error);
    }

    // Keep mutex locked until the actual work finishes
    await work.catch(() => {});
    this.isRunning = false;
  };
}
