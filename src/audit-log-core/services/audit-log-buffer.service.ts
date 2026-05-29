import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';

import { AuditLogBufferConfig } from '../../interfaces/audit-log-module-options.interface';

export type BufferEntry = {
  logType: string;
  data: any;
  userInfo: { id: string; ip: string };
  timestamp: Date;
  retryCount?: number;
};

@Injectable()
export class AuditLogBufferService implements OnModuleDestroy {
  private readonly logger = new Logger(AuditLogBufferService.name);
  private readonly entries: BufferEntry[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private isFlushing = false;
  private activeFlush: Promise<void> | null = null;
  private droppedEntries = 0;

  constructor(
    @Inject('BUFFER_CONFIG')
    private readonly config: AuditLogBufferConfig,
  ) {
    this.startFlushTimer();
  }

  private flushCallback?: (entries: BufferEntry[]) => Promise<void>;

  setFlushCallback(callback: (entries: BufferEntry[]) => Promise<void>): void {
    this.flushCallback = callback;
  }

  add(entry: BufferEntry): void {
    if (this.entries.length >= this.config.maxBufferSize && this.isFlushing) {
      this.droppedEntries += 1;
      this.logger.error(
        `Buffer overflow — dropping entry (flushing in progress, ${this.entries.length}/${this.config.maxBufferSize})`,
      );
      return;
    }

    this.entries.push(entry);

    if (this.entries.length >= this.config.maxBufferSize) {
      this.logger.warn('Buffer full — forcing immediate flush');
      void this.flush();
      return;
    }

    if (this.entries.length >= this.config.maxBufferSize * 0.8) {
      this.logger.warn(
        `Buffer at ${Math.round((this.entries.length / this.config.maxBufferSize) * 100)}% capacity (${this.entries.length}/${this.config.maxBufferSize})`,
      );
    }

    if (this.entries.length >= this.config.bufferSize) {
      void this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.isFlushing) {
      await this.activeFlush;
      return;
    }

    if (this.entries.length === 0) return;

    this.isFlushing = true;

    const batch = this.entries.splice(0, this.entries.length);
    this.activeFlush = this.flushBatch(batch);
    await this.activeFlush;
  }

  private async flushBatch(batch: BufferEntry[]): Promise<void> {
    try {
      if (!this.flushCallback) {
        throw new Error('Audit log buffer flush callback is not configured');
      }

      await this.flushCallback(
        batch.map(({ retryCount: _retryCount, ...entry }) => entry),
      );
    } catch (error) {
      this.logger.error('Error flushing audit log buffer:', error);
      this.requeueFailedBatch(batch);
    } finally {
      this.isFlushing = false;
      this.activeFlush = null;

      if (this.entries.length >= this.config.bufferSize) {
        void this.flush();
      }
    }
  }

  private requeueFailedBatch(batch: BufferEntry[]): void {
    const maxRetries = this.config.maxFlushRetries ?? 3;
    const retriedEntries = batch.map((entry) => ({
      ...entry,
      retryCount: (entry.retryCount ?? 0) + 1,
    }));
    const retryableEntries = retriedEntries.filter(
      (entry) => (entry.retryCount ?? 0) <= maxRetries,
    );
    const permanentlyDropped = retriedEntries.length - retryableEntries.length;

    if (permanentlyDropped > 0) {
      this.droppedEntries += permanentlyDropped;
      this.logger.error(
        `Dropping ${permanentlyDropped} audit log buffer entries after ${maxRetries} failed flush attempts`,
      );
    }

    if (retryableEntries.length === 0) return;

    this.entries.unshift(...retryableEntries);

    if (this.entries.length > this.config.maxBufferSize) {
      const overflowEntries = this.entries.splice(this.config.maxBufferSize);
      this.droppedEntries += overflowEntries.length;
      this.logger.error(
        `Buffer overflow after flush failure — dropping ${overflowEntries.length} queued entries`,
      );
    }
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      void this.flush();
    }, this.config.flushIntervalMs);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    if (this.activeFlush) {
      await this.activeFlush;
    }

    const maxShutdownFlushes = (this.config.maxFlushRetries ?? 3) + 1;
    let shutdownFlushes = 0;

    while (this.entries.length > 0 && shutdownFlushes < maxShutdownFlushes) {
      shutdownFlushes += 1;
      await this.flush();
    }

    if (this.entries.length > 0) {
      this.droppedEntries += this.entries.length;
      this.logger.error(
        `Shutdown completed with ${this.entries.length} audit log buffer entries not persisted`,
      );
      this.entries.splice(0, this.entries.length);
    }

    this.logger.log('Buffer flushed on shutdown');
  }

  getBufferSize(): number {
    return this.entries.length;
  }

  getDroppedEntriesCount(): number {
    return this.droppedEntries;
  }
}
