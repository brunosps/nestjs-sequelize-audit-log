import {
  Column,
  CreatedAt,
  DataType,
  Default,
  ForeignKey,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';

import { AuditLogModel } from './audit-log.model';

@Table({
  tableName: 'audit_logs_event',
  timestamps: false,
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
