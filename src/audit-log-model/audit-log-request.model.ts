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
  tableName: 'audit_logs_request',
  timestamps: false,
  indexes: [
    // Índices para logs de requisições
    {
      fields: ['log_id', 'created_at'],
      name: 'idx_audit_logs_request_log_id_created_at',
    },
    {
      fields: ['request_method', 'response_status', 'created_at'],
      name: 'idx_audit_logs_request_method_status_created_at',
    },
    // Índice para request_url com tamanho limitado
    {
      fields: [{ name: 'request_url', length: 255 }],
      name: 'idx_audit_logs_request_url',
    },
    {
      fields: ['response_status', 'created_at'],
      name: 'idx_audit_logs_request_status_created_at',
    },
    { fields: ['duration'], name: 'idx_audit_logs_request_duration' },
    // Índice para deleção em batch
    { fields: ['log_id'], name: 'idx_audit_logs_request_batch_delete' },
    // Índices para consultas de análise de performance
    {
      fields: ['created_at', 'duration'],
      name: 'idx_audit_logs_request_performance_analysis',
    },
  ],
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
