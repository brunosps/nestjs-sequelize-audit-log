import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';

import { AuditLogBufferConfig } from '../../interfaces/audit-log-module-options.interface';

export type BufferEntry = {
  logType: string;
  data: any;
  userInfo: { id: string; ip: string };
  timestamp: Date;
};

@Injectable()
export class AuditLogBufferService implements OnModuleDestroy {
  private readonly logger = new Logger(AuditLogBufferService.name);
  private readonly entries: BufferEntry[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private isFlushing = false;

  constructor(
    @Inject('BUFFER_CONFIG')
    private readonly config: AuditLogBufferConfig,
    @Inject('FLUSH_CALLBACK')
    private readonly flushCallback: (entries: BufferEntry[]) => Promise<void>,
  ) {
    this.startFlushTimer();
  }

  add(entry: BufferEntry): void {
    if (this.entries.length >= this.config.maxBufferSize && this.isFlushing) {
      this.logger.error(
        `Buffer overflow — dropping entry (flushing in progress, ${this.entries.length}/${this.config.maxBufferSize})`,
      );
      return;
    }

    this.entries.push(entry);

    if (this.entries.length >= this.config.maxBufferSize) {
      this.logger.warn('Buffer full — forcing immediate flush');
      this.flush();
      return;
    }

    if (this.entries.length >= this.config.maxBufferSize * 0.8) {
      this.logger.warn(
        `Buffer at ${Math.round((this.entries.length / this.config.maxBufferSize) * 100)}% capacity (${this.entries.length}/${this.config.maxBufferSize})`,
      );
    }

    if (this.entries.length >= this.config.bufferSize) {
      this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.isFlushing || this.entries.length === 0) return;
    this.isFlushing = true;

    const batch = this.entries.splice(0, this.entries.length);
    try {
      await this.flushCallback(batch);
    } catch (error) {
      this.logger.error('Error flushing audit log buffer:', error);
    } finally {
      this.isFlushing = false;
    }
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushIntervalMs);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    await this.flush();
    this.logger.log('Buffer flushed on shutdown');
  }

  getBufferSize(): number {
    return this.entries.length;
  }
}
