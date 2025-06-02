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
  tableName: 'audit_logs_request',
  timestamps: false,
})
export class AuditLogRequestModel extends Model<AuditLogRequestModel> {
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
    field: 'request_method',
  })
  requestMethod!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    field: 'request_url',
  })
  requestURL!: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    field: 'response_status',
  })
  responseStatus!: number;

  @Default(0)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    field: 'response_size',
  })
  responseSize!: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    field: 'duration',
  })
  duration!: number;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    field: 'payload',
  })
  payload?: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    field: 'response_body',
  })
  responseBody?: string;

  @CreatedAt
  @Default(DataType.NOW)
  @Column({
    type: DataType.DATE,
    allowNull: false,
    field: 'created_at',
  })
  createdAt!: Date;
}
