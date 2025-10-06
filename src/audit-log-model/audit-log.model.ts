import {
  Column,
  CreatedAt,
  DataType,
  Default,
  Index,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';

@Table({
  tableName: 'audit_logs',
  timestamps: false,
  indexes: [
    // Índice principal para cursor-based pagination no archiving
    { fields: ['created_at', 'id'], name: 'idx_audit_logs_created_at_id' },
    // Índice para queries por tipo de log
    {
      fields: ['log_type', 'created_at'],
      name: 'idx_audit_logs_log_type_created_at',
    },
    // Índice para queries por usuário
    {
      fields: ['user_id', 'created_at'],
      name: 'idx_audit_logs_user_id_created_at',
    },
    // Índice para queries por IP
    {
      fields: ['ip_address', 'created_at'],
      name: 'idx_audit_logs_ip_address_created_at',
    },
    // Índice composto para queries complexas
    {
      fields: ['log_type', 'user_id', 'created_at'],
      name: 'idx_audit_logs_composite_search',
    },
    // Índices para análise de segurança
    {
      fields: ['ip_address', 'log_type', 'created_at'],
      name: 'idx_audit_logs_security_analysis',
    },
  ],
})
export class AuditLogModel extends Model<AuditLogModel> {
  @PrimaryKey
  @Column({
    type: DataType.UUID,
    allowNull: false,
    field: 'id',
  })
  id!: string;

  @Column({
    type: DataType.ENUM(
      'ENTITY',
      'REQUEST',
      'ERROR',
      'EVENT',
      'LOGIN',
      'INTEGRATION',
    ),
    allowNull: false,
    field: 'log_type',
  })
  logType!: 'ENTITY' | 'REQUEST' | 'ERROR' | 'EVENT' | 'LOGIN' | 'INTEGRATION';

  @Default('0.0.0.0')
  @Column({
    type: DataType.STRING,
    allowNull: false,
    field: 'ip_address',
  })
  ipAddress!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    field: 'user_id',
  })
  userId!: string;

  @CreatedAt
  @Default(DataType.NOW)
  @Column({
    type: DataType.DATE,
    allowNull: false,
    field: 'created_at',
  })
  createdAt!: Date;
}
