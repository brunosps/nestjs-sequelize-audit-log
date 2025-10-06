import {
  Column,
  CreatedAt,
  DataType,
  Default,
  ForeignKey,
  Index,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';

import { AuditLogModel } from './audit-log.model';

@Table({
  tableName: 'audit_logs_event',
  timestamps: false,
  indexes: [
    // Índices para logs de eventos
    {
      fields: ['log_id', 'created_at'],
      name: 'idx_audit_logs_event_log_id_created_at',
    },
    {
      fields: ['event_type', 'created_at'],
      name: 'idx_audit_logs_event_type_created_at',
    },
    // Índice para deleção em batch
    { fields: ['log_id'], name: 'idx_audit_logs_event_batch_delete' },
  ],
})
export class AuditLogEventModel extends Model<AuditLogEventModel> {
  @ForeignKey(() => AuditLogModel)
  @Column({
    type: DataType.UUID,
    allowNull: false,
    field: 'log_id',
  })
  logId!: string;

  @PrimaryKey
  @Column({
    type: DataType.UUID,
    allowNull: false,
    field: 'id',
  })
  id!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    field: 'event_type',
  })
  eventType!: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    field: 'event_description',
  })
  eventDescription!: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    field: 'event_details',
  })
  eventDetails?: string;

  @CreatedAt
  @Default(DataType.NOW)
  @Column({
    type: DataType.DATE,
    allowNull: false,
    field: 'created_at',
  })
  createdAt!: Date;
}
