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
  tableName: 'audit_logs_integration',
  timestamps: false,
  indexes: [
    // Índices para logs de integração
    {
      fields: ['log_id', 'created_at'],
      name: 'idx_audit_logs_integration_log_id_created_at',
    },
    // Índice para integration_name com tamanho limitado
    {
      fields: [
        { name: 'integration_name', length: 255 },
        'status',
        'created_at',
      ],
      name: 'idx_audit_logs_integration_name_status_created_at',
    },
    {
      fields: ['status', 'created_at'],
      name: 'idx_audit_logs_integration_status_created_at',
    },
    { fields: ['duration'], name: 'idx_audit_logs_integration_duration' },
    // Índice para deleção em batch
    { fields: ['log_id'], name: 'idx_audit_logs_integration_batch_delete' },
  ],
})
export class AuditLogIntegrationModel extends Model<AuditLogIntegrationModel> {
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
    field: 'integration_name',
  })
  integrationName!: string;

  @Column({ type: DataType.STRING, allowNull: false })
  method!: string;

  @Column({ type: DataType.TEXT, field: 'request_payload' })
  requestPayload!: string;

  @Column({ type: DataType.TEXT, field: 'response_payload' })
  responsePayload!: string;

  @Column({ type: DataType.STRING, allowNull: false })
  status!: string;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  duration!: number;

  @CreatedAt
  @Default(DataType.NOW)
  @Column({
    type: DataType.DATE,
    allowNull: false,
    field: 'created_at',
  })
  createdAt!: Date;
}
