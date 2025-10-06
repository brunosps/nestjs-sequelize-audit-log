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
  tableName: 'audit_logs_login',
  timestamps: false,
  indexes: [
    // Índices para logs de login
    {
      fields: ['log_id', 'created_at'],
      name: 'idx_audit_logs_login_log_id_created_at',
    },
    {
      fields: ['system', 'user_id', 'created_at'],
      name: 'idx_audit_logs_login_system_user_created_at',
    },
    {
      fields: ['user_id', 'created_at'],
      name: 'idx_audit_logs_login_user_created_at',
    },
    // Índice para deleção em batch
    { fields: ['log_id'], name: 'idx_audit_logs_login_batch_delete' },
  ],
})
export class AuditLogLoginModel extends Model<AuditLogLoginModel> {
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
    field: 'system',
  })
  system!: string;

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
