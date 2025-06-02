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
  tableName: 'audit_logs_error',
  timestamps: false,
})
export class AuditLogErrorModel extends Model<AuditLogErrorModel> {
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
    type: DataType.TEXT,
    allowNull: false,
    field: 'error_message',
  })
  errorMessage!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    field: 'error_type',
  })
  errorType!: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    field: 'stack_trace',
  })
  stackTrace!: string;

  @CreatedAt
  @Default(DataType.NOW)
  @Column({
    type: DataType.DATE,
    allowNull: false,
    field: 'created_at',
  })
  createdAt!: Date;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    field: 'request_path',
  })
  requestPath!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    field: 'request_method',
  })
  requestMethod!: string;
}
