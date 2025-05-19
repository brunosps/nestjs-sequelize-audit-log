import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AuditLogArchiveService } from '../services/audit-log-archive.service';

@Injectable()
export class AuditLogArchiveTask {
  constructor(private readonly archiveService: AuditLogArchiveService) {}

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async handleArchiving() {
    console.log('Starting scheduled audit log archiving...');
    await this.archiveService.execute();
    console.log('Scheduled audit log archiving completed.');
  }
}
