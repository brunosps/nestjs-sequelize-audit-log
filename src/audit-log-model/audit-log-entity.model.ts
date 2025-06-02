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
  tableName: 'audit_logs_entity',
  timestamps: false,
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

  @CreatedAt
  @Default(DataType.NOW)
  @Column({
    type: DataType.DATE,
    allowNull: false,
    field: 'created_at',
  })
  createdAt!: Date;
}
