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
  tableName: 'audit_logs_error',
  timestamps: false,
  indexes: [
    // Índices para logs de erro
    {
      fields: ['log_id', 'created_at'],
      name: 'idx_audit_logs_error_log_id_created_at',
    },
    {
      fields: ['error_type', 'created_at'],
      name: 'idx_audit_logs_error_type_created_at',
    },
    // Índice para request_path com tamanho limitado
    {
      fields: [
        { name: 'request_path', length: 255 },
        'request_method',
        'created_at',
      ],
      name: 'idx_audit_logs_error_path_method_created_at',
    },
    // Índice para deleção em batch
    { fields: ['log_id'], name: 'idx_audit_logs_error_batch_delete' },
  ],
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
