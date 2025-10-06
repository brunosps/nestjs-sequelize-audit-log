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
  tableName: 'audit_logs_entity',
  timestamps: false,
  indexes: [
    // Índices para consultas de entidades
    {
      fields: ['log_id', 'created_at'],
      name: 'idx_audit_logs_entity_log_id_created_at',
    },
    {
      fields: ['entity', 'action', 'created_at'],
      name: 'idx_audit_logs_entity_entity_action_created_at',
    },
    // Índice para entity_key (STRING - compatível com SQL Server)
    {
      fields: ['entity_key', 'entity'],
      name: 'idx_audit_logs_entity_key_entity',
    },
    {
      fields: ['action', 'created_at'],
      name: 'idx_audit_logs_entity_action_created_at',
    },
    // Índice para deleção em batch
    { fields: ['log_id'], name: 'idx_audit_logs_entity_batch_delete' },
    // Índices para relatórios de auditoria
    {
      fields: ['entity', 'created_at', 'action'],
      name: 'idx_audit_logs_entity_audit_reports',
    },
  ],
})
export class AuditLogEntityModel extends Model<AuditLogEntityModel> {
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
    type: DataType.ENUM('CREATE', 'UPDATE', 'DELETE'),
    allowNull: false,
    field: 'action',
  })
  action!: 'CREATE' | 'UPDATE' | 'DELETE';

  @Column({
    type: DataType.STRING,
    allowNull: false,
    field: 'entity',
  })
  entity!: string;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
    field: 'changed_values',
  })
  changedValues!: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    field: 'entity_pk',
  })
  entityPk?: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    field: 'entity_key',
  })
  entityKey?: string;

  @CreatedAt
  @Default(DataType.NOW)
  @Column({
    type: DataType.DATE,
    allowNull: false,
    field: 'created_at',
  })
  createdAt!: Date;
}
